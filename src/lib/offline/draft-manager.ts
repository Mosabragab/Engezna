/**
 * Draft Manager - مدير المسودات
 *
 * Handles localStorage-based draft management for custom orders:
 * - Auto-save drafts every 30 seconds
 * - Restore drafts on page load
 * - Expire drafts after 72 hours
 * - Per-provider draft storage
 *
 * @version 1.0
 * @date January 2026
 */

import type { CustomOrderDraft, CustomOrderInputType } from '@/types/custom-order';
import { DRAFT_KEY_PREFIX, DRAFT_EXPIRY_HOURS } from '@/types/custom-order';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface DraftInput {
  providerId: string;
  providerName: string;
  inputType: CustomOrderInputType;
  text?: string;
  imageDataUrls?: string[];
  notes?: string;
}

export interface DraftManagerConfig {
  autoSaveInterval?: number; // Default: 30000ms (30 seconds)
  expiryHours?: number; // Default: 72 hours
}

export interface SavedDraftInfo {
  providerId: string;
  providerName: string;
  savedAt: Date;
  hasText: boolean;
  hasImages: boolean;
  imageCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const ALL_DRAFTS_KEY = 'custom_order_drafts_index';

// ═══════════════════════════════════════════════════════════════════════════════
// Draft Manager Class
// ═══════════════════════════════════════════════════════════════════════════════

export class DraftManager {
  private autoSaveInterval: number;
  private expiryHours: number;
  private autoSaveTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(config?: DraftManagerConfig) {
    this.autoSaveInterval = config?.autoSaveInterval ?? DEFAULT_AUTO_SAVE_INTERVAL;
    this.expiryHours = config?.expiryHours ?? DRAFT_EXPIRY_HOURS;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Core CRUD Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save draft to localStorage
   * حفظ المسودة
   */
  saveDraft(draft: DraftInput): void {
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage not available');
      return;
    }

    const key = this.getDraftKey(draft.providerId);
    const draftData: CustomOrderDraft = {
      ...draft,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(draftData));
      this.updateDraftsIndex(draft.providerId, 'add');
    } catch (error) {
      // Handle quota exceeded or other errors
      console.error('Error saving draft:', error);
      // Try to clean up expired drafts and retry
      this.cleanupExpiredDrafts();
      try {
        localStorage.setItem(key, JSON.stringify(draftData));
        this.updateDraftsIndex(draft.providerId, 'add');
      } catch (retryError) {
        console.error('Failed to save draft after cleanup:', retryError);
      }
    }
  }

  /**
   * Load draft from localStorage
   * تحميل المسودة
   */
  loadDraft(providerId: string): CustomOrderDraft | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    const key = this.getDraftKey(providerId);
    const data = localStorage.getItem(key);

    if (!data) {
      return null;
    }

    try {
      const draft = JSON.parse(data) as CustomOrderDraft;

      // Check if expired
      if (this.isDraftExpired(draft)) {
        this.deleteDraft(providerId);
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Error parsing draft:', error);
      this.deleteDraft(providerId);
      return null;
    }
  }

  /**
   * Delete draft from localStorage
   * حذف المسودة
   */
  deleteDraft(providerId: string): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    const key = this.getDraftKey(providerId);
    localStorage.removeItem(key);
    this.updateDraftsIndex(providerId, 'remove');
    this.stopAutoSave(providerId);
  }

  /**
   * Check if draft exists for provider
   * التحقق من وجود مسودة
   */
  hasDraft(providerId: string): boolean {
    return this.loadDraft(providerId) !== null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-Save Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start auto-save timer for a provider
   * بدء الحفظ التلقائي
   */
  startAutoSave(providerId: string, getDraftData: () => DraftInput | null): void {
    // Stop existing timer if any
    this.stopAutoSave(providerId);

    const timer = setInterval(() => {
      const draftData = getDraftData();
      if (draftData && this.hasMeaningfulContent(draftData)) {
        this.saveDraft(draftData);
      }
    }, this.autoSaveInterval);

    this.autoSaveTimers.set(providerId, timer);
  }

  /**
   * Stop auto-save timer for a provider
   * إيقاف الحفظ التلقائي
   */
  stopAutoSave(providerId: string): void {
    const timer = this.autoSaveTimers.get(providerId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(providerId);
    }
  }

  /**
   * Stop all auto-save timers
   * إيقاف جميع مؤقتات الحفظ التلقائي
   */
  stopAllAutoSave(): void {
    this.autoSaveTimers.forEach((timer) => clearInterval(timer));
    this.autoSaveTimers.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Multiple Drafts Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all saved drafts info (for drafts list)
   * الحصول على معلومات جميع المسودات
   */
  getAllDraftsInfo(): SavedDraftInfo[] {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    const index = this.getDraftsIndex();
    const draftsInfo: SavedDraftInfo[] = [];

    for (const providerId of index) {
      const draft = this.loadDraft(providerId);
      if (draft) {
        draftsInfo.push({
          providerId: draft.providerId,
          providerName: draft.providerName,
          savedAt: new Date(draft.savedAt),
          hasText: !!draft.text?.trim(),
          hasImages: !!draft.imageDataUrls?.length,
          imageCount: draft.imageDataUrls?.length ?? 0,
        });
      }
    }

    // Sort by savedAt descending (most recent first)
    return draftsInfo.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  }

  /**
   * Get total draft count
   * الحصول على عدد المسودات
   */
  getDraftCount(): number {
    return this.getDraftsIndex().length;
  }

  /**
   * Delete all drafts
   * حذف جميع المسودات
   */
  deleteAllDrafts(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    const index = this.getDraftsIndex();
    for (const providerId of index) {
      const key = this.getDraftKey(providerId);
      localStorage.removeItem(key);
    }

    localStorage.removeItem(ALL_DRAFTS_KEY);
    this.stopAllAutoSave();
  }

  /**
   * Cleanup expired drafts
   * تنظيف المسودات المنتهية
   */
  cleanupExpiredDrafts(): number {
    if (!this.isLocalStorageAvailable()) {
      return 0;
    }

    let cleaned = 0;
    const index = this.getDraftsIndex();

    for (const providerId of index) {
      const key = this.getDraftKey(providerId);
      const data = localStorage.getItem(key);

      if (data) {
        try {
          const draft = JSON.parse(data) as CustomOrderDraft;
          if (this.isDraftExpired(draft)) {
            this.deleteDraft(providerId);
            cleaned++;
          }
        } catch {
          // Invalid data, remove it
          localStorage.removeItem(key);
          this.updateDraftsIndex(providerId, 'remove');
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get draft storage key for a provider
   */
  private getDraftKey(providerId: string): string {
    return `${DRAFT_KEY_PREFIX}${providerId}`;
  }

  /**
   * Check if draft is expired
   */
  private isDraftExpired(draft: CustomOrderDraft): boolean {
    const expiryMs = this.expiryHours * 60 * 60 * 1000;
    return Date.now() - draft.savedAt > expiryMs;
  }

  /**
   * Check if draft has meaningful content worth saving
   */
  private hasMeaningfulContent(draft: DraftInput): boolean {
    return !!(
      draft.text?.trim() ||
      draft.imageDataUrls?.length ||
      draft.notes?.trim()
    );
  }

  /**
   * Get drafts index (list of provider IDs with drafts)
   */
  private getDraftsIndex(): string[] {
    const data = localStorage.getItem(ALL_DRAFTS_KEY);
    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Update drafts index
   */
  private updateDraftsIndex(providerId: string, action: 'add' | 'remove'): void {
    const index = this.getDraftsIndex();

    if (action === 'add') {
      if (!index.includes(providerId)) {
        index.push(providerId);
      }
    } else {
      const idx = index.indexOf(providerId);
      if (idx !== -1) {
        index.splice(idx, 1);
      }
    }

    localStorage.setItem(ALL_DRAFTS_KEY, JSON.stringify(index));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let draftManagerInstance: DraftManager | null = null;

/**
 * Get singleton draft manager instance
 */
export function getDraftManager(config?: DraftManagerConfig): DraftManager {
  if (!draftManagerInstance) {
    draftManagerInstance = new DraftManager(config);
  }
  return draftManagerInstance;
}

/**
 * Reset draft manager (for testing)
 */
export function resetDraftManager(): void {
  if (draftManagerInstance) {
    draftManagerInstance.stopAllAutoSave();
  }
  draftManagerInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * React hook for using draft manager
 * Usage:
 *
 * ```tsx
 * const { draft, saveDraft, deleteDraft, startAutoSave } = useDraftManager(providerId);
 *
 * useEffect(() => {
 *   startAutoSave(() => ({
 *     providerId,
 *     providerName,
 *     inputType: 'text',
 *     text: orderText,
 *   }));
 *   return () => stopAutoSave();
 * }, []);
 * ```
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useDraftManager(providerId: string, providerName: string) {
  const manager = getDraftManager();
  const [draft, setDraft] = useState<CustomOrderDraft | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const getDraftDataRef = useRef<(() => DraftInput | null) | null>(null);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = manager.loadDraft(providerId);
    setDraft(savedDraft);
    if (savedDraft) {
      setLastSaved(new Date(savedDraft.savedAt));
    }
  }, [providerId, manager]);

  // Save draft
  const saveDraft = useCallback(
    (input: Omit<DraftInput, 'providerId' | 'providerName'>) => {
      const fullInput: DraftInput = {
        ...input,
        providerId,
        providerName,
      };
      manager.saveDraft(fullInput);
      setLastSaved(new Date());

      // Update local state
      const newDraft = manager.loadDraft(providerId);
      setDraft(newDraft);
    },
    [providerId, providerName, manager]
  );

  // Delete draft
  const deleteDraft = useCallback(() => {
    manager.deleteDraft(providerId);
    setDraft(null);
    setLastSaved(null);
  }, [providerId, manager]);

  // Start auto-save
  const startAutoSave = useCallback(
    (getDraftData: () => DraftInput | null) => {
      getDraftDataRef.current = getDraftData;
      manager.startAutoSave(providerId, () => {
        const data = getDraftDataRef.current?.() ?? null;
        if (data) {
          setLastSaved(new Date());
        }
        return data;
      });
    },
    [providerId, manager]
  );

  // Stop auto-save
  const stopAutoSave = useCallback(() => {
    manager.stopAutoSave(providerId);
  }, [providerId, manager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manager.stopAutoSave(providerId);
    };
  }, [providerId, manager]);

  return {
    draft,
    lastSaved,
    saveDraft,
    deleteDraft,
    startAutoSave,
    stopAutoSave,
    hasDraft: draft !== null,
  };
}

/**
 * Hook for getting all drafts (for drafts list page)
 */
export function useDraftsList() {
  const manager = getDraftManager();
  const [drafts, setDrafts] = useState<SavedDraftInfo[]>([]);
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    setDrafts(manager.getAllDraftsInfo());
    setCount(manager.getDraftCount());
  }, [manager]);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteDraft = useCallback(
    (providerId: string) => {
      manager.deleteDraft(providerId);
      refresh();
    },
    [manager, refresh]
  );

  const deleteAllDrafts = useCallback(() => {
    manager.deleteAllDrafts();
    refresh();
  }, [manager, refresh]);

  const cleanupExpired = useCallback(() => {
    const cleaned = manager.cleanupExpiredDrafts();
    refresh();
    return cleaned;
  }, [manager, refresh]);

  return {
    drafts,
    count,
    refresh,
    deleteDraft,
    deleteAllDrafts,
    cleanupExpired,
  };
}
