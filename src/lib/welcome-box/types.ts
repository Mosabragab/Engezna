import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export interface WelcomeBoxState {
  granted: boolean;
  grantedAt: string | null;
  usedAt: string | null;
  entryId: string | null;
}

export interface GrantWelcomeBoxResult {
  granted: boolean;
  entryId?: string;
  expiresAt?: string;
  reason?: 'already_granted' | 'gift_template_missing';
  grantedAt?: string;
}
