/**
 * Welcome Box Service (v2.5.2)
 *
 * Grants a free-delivery welcome gift (7-day expiry) to every newly
 * email-verified signup. Idempotent: re-running returns granted=false.
 *
 * Budget: 30% of monthly retention budget (6,000 EGP target).
 * Bucket: 'welcome' in retention_settings.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.1 (v2.5.2)
 */

import type { AnySupabaseClient, GrantWelcomeBoxResult, WelcomeBoxState } from './types';

export class WelcomeBoxService {
  constructor(private supabase: AnySupabaseClient) {}

  /**
   * Grants the welcome box atomically. Calls the SQL RPC that handles:
   *   - Idempotency check (welcome_box_granted_at)
   *   - Gift template resolution (auto-creates if missing)
   *   - gift_box_entries insert + gift_financial_log + profile update
   */
  async grant(userId: string): Promise<GrantWelcomeBoxResult> {
    const { data, error } = await this.supabase.rpc('grant_welcome_box_atomic', {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`WelcomeBoxService.grant failed: ${error.message}`);
    }

    return data as GrantWelcomeBoxResult;
  }

  /**
   * Returns the current state of the user's welcome box (granted / used / pending).
   */
  async getState(userId: string): Promise<WelcomeBoxState> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('welcome_box_granted_at, welcome_box_used_at, welcome_box_entry_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`WelcomeBoxService.getState failed: ${error.message}`);
    }

    return {
      granted: Boolean(data?.welcome_box_granted_at),
      grantedAt: data?.welcome_box_granted_at ?? null,
      usedAt: data?.welcome_box_used_at ?? null,
      entryId: data?.welcome_box_entry_id ?? null,
    };
  }

  /**
   * Returns the unopened welcome box entry (for the Homepage Surprise Card).
   * Returns null if the user already opened or used the welcome box.
   */
  async getPendingEntry(userId: string) {
    const state = await this.getState(userId);
    if (!state.granted || state.usedAt || !state.entryId) return null;

    const { data, error } = await this.supabase
      .from('gift_box_entries')
      .select('id, source, status, expires_at, gift_id')
      .eq('id', state.entryId)
      .in('status', ['granted', 'opened'])
      .maybeSingle();

    if (error) {
      throw new Error(`WelcomeBoxService.getPendingEntry failed: ${error.message}`);
    }

    return data;
  }
}
