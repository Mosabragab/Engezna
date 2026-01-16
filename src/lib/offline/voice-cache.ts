/**
 * Voice Cache - ذاكرة التسجيلات الصوتية
 *
 * Handles IndexedDB-based caching for voice recordings:
 * - Store voice blobs offline
 * - Auto-sync when online
 * - Retry failed uploads
 * - Cleanup old cached recordings
 *
 * Uses IndexedDB for larger blob storage (localStorage is limited to ~5MB strings)
 *
 * @version 1.0
 * @date January 2026
 */

import type { CachedVoiceRecording } from '@/types/custom-order';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceCacheConfig {
  maxRetries?: number; // Default: 3
  retryDelayMs?: number; // Default: 2000ms
  cacheExpiryHours?: number; // Default: 72 hours
}

export interface VoiceCacheStats {
  totalRecordings: number;
  pendingUploads: number;
  failedUploads: number;
  totalSizeBytes: number;
}

export type UploadCallback = (id: string, blob: Blob, providerId: string) => Promise<string>; // Returns URL

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'engezna-voice-cache';
const DB_VERSION = 1;
const STORE_NAME = 'voice_recordings';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 2000;
const DEFAULT_CACHE_EXPIRY_HOURS = 72;

// ═══════════════════════════════════════════════════════════════════════════════
// IndexedDB Voice Cache
// ═══════════════════════════════════════════════════════════════════════════════

export class VoiceCache {
  private db: IDBDatabase | null = null;
  private maxRetries: number;
  private retryDelayMs: number;
  private cacheExpiryHours: number;
  private uploadCallback: UploadCallback | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress: boolean = false;

  constructor(config?: VoiceCacheConfig) {
    this.maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = config?.retryDelayMs ?? DEFAULT_RETRY_DELAY;
    this.cacheExpiryHours = config?.cacheExpiryHours ?? DEFAULT_CACHE_EXPIRY_HOURS;

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Database Initialization
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the IndexedDB database
   * تهيئة قاعدة البيانات
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB not available');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open voice cache database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('providerId', 'providerId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Core Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Store a voice recording in cache
   * حفظ تسجيل صوتي
   */
  async store(id: string, blob: Blob, providerId: string): Promise<void> {
    await this.ensureDb();

    const recording: CachedVoiceRecording = {
      id,
      blob,
      providerId,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(recording);

      request.onerror = () => {
        console.error('Failed to store voice recording:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();

        // Try to upload if online
        if (this.isOnline && this.uploadCallback) {
          this.tryUpload(id);
        }
      };
    });
  }

  /**
   * Get a voice recording from cache
   * الحصول على تسجيل صوتي
   */
  async get(id: string): Promise<CachedVoiceRecording | null> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => {
        console.error('Failed to get voice recording:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Delete a voice recording from cache
   * حذف تسجيل صوتي
   */
  async delete(id: string): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        console.error('Failed to delete voice recording:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get all pending recordings for a provider
   * الحصول على جميع التسجيلات المعلقة
   */
  async getPendingByProvider(providerId: string): Promise<CachedVoiceRecording[]> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('providerId');
      const request = index.getAll(providerId);

      request.onerror = () => {
        console.error('Failed to get recordings:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const recordings = request.result.filter(
          (r: CachedVoiceRecording) => r.status === 'pending'
        );
        resolve(recordings);
      };
    });
  }

  /**
   * Get all pending recordings
   * الحصول على جميع التسجيلات المعلقة
   */
  async getAllPending(): Promise<CachedVoiceRecording[]> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onerror = () => {
        console.error('Failed to get pending recordings:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Upload & Sync
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set the upload callback function
   * تعيين دالة الرفع
   */
  setUploadCallback(callback: UploadCallback): void {
    this.uploadCallback = callback;
  }

  /**
   * Try to upload a single recording
   * محاولة رفع تسجيل
   */
  async tryUpload(id: string): Promise<string | null> {
    if (!this.uploadCallback) {
      console.warn('No upload callback set');
      return null;
    }

    const recording = await this.get(id);
    if (!recording || recording.status === 'uploaded') {
      return null;
    }

    try {
      const url = await this.uploadCallback(id, recording.blob, recording.providerId);

      // Mark as uploaded
      await this.updateStatus(id, 'uploaded');

      return url;
    } catch (error) {
      console.error('Upload failed:', error);

      // Increment retry count
      const newRetryCount = recording.retryCount + 1;

      if (newRetryCount >= this.maxRetries) {
        await this.updateStatus(id, 'failed', newRetryCount);
      } else {
        await this.updateStatus(id, 'pending', newRetryCount);

        // Schedule retry
        setTimeout(
          () => {
            if (this.isOnline) {
              this.tryUpload(id);
            }
          },
          this.retryDelayMs * Math.pow(2, newRetryCount - 1)
        ); // Exponential backoff
      }

      return null;
    }
  }

  /**
   * Sync all pending recordings
   * مزامنة جميع التسجيلات المعلقة
   */
  async syncAll(): Promise<void> {
    if (!this.uploadCallback || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pending = await this.getAllPending();

      for (const recording of pending) {
        if (this.isOnline) {
          await this.tryUpload(recording.id);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clean up old cached recordings
   * تنظيف التسجيلات القديمة
   */
  async cleanup(): Promise<number> {
    await this.ensureDb();

    const expiryTime = Date.now() - this.cacheExpiryHours * 60 * 60 * 1000;
    let cleaned = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(expiryTime);
      const request = index.openCursor(range);

      request.onerror = () => {
        console.error('Failed to cleanup:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          // Delete if expired and either uploaded or failed
          const recording = cursor.value as CachedVoiceRecording;
          if (recording.status === 'uploaded' || recording.status === 'failed') {
            cursor.delete();
            cleaned++;
          }
          cursor.continue();
        } else {
          resolve(cleaned);
        }
      };
    });
  }

  /**
   * Clear all cached recordings
   * حذف جميع التسجيلات المخزنة
   */
  async clearAll(): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        console.error('Failed to clear cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Statistics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get cache statistics
   * الحصول على إحصائيات الذاكرة
   */
  async getStats(): Promise<VoiceCacheStats> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Failed to get stats:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const recordings = request.result as CachedVoiceRecording[];

        const stats: VoiceCacheStats = {
          totalRecordings: recordings.length,
          pendingUploads: recordings.filter((r) => r.status === 'pending').length,
          failedUploads: recordings.filter((r) => r.status === 'failed').length,
          totalSizeBytes: recordings.reduce((sum, r) => sum + r.blob.size, 0),
        };

        resolve(stats);
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Ensure database is initialized
   */
  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
  }

  /**
   * Update recording status
   */
  private async updateStatus(
    id: string,
    status: CachedVoiceRecording['status'],
    retryCount?: number
  ): Promise<void> {
    await this.ensureDb();

    const recording = await this.get(id);
    if (!recording) {
      return;
    }

    const updated: CachedVoiceRecording = {
      ...recording,
      status,
      retryCount: retryCount ?? recording.retryCount,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(updated);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.isOnline = true;
    // Start sync when back online
    this.syncAll();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.isOnline = false;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let voiceCacheInstance: VoiceCache | null = null;

/**
 * Get singleton voice cache instance
 */
export async function getVoiceCache(config?: VoiceCacheConfig): Promise<VoiceCache> {
  if (!voiceCacheInstance) {
    voiceCacheInstance = new VoiceCache(config);
    await voiceCacheInstance.init();
  }
  return voiceCacheInstance;
}

/**
 * Reset voice cache (for testing)
 */
export async function resetVoiceCache(): Promise<void> {
  if (voiceCacheInstance) {
    voiceCacheInstance.close();
  }
  voiceCacheInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

export function useVoiceCache(uploadCallback?: UploadCallback) {
  const [cache, setCache] = useState<VoiceCache | null>(null);
  const [stats, setStats] = useState<VoiceCacheStats | null>(null);
  const [isReady, setIsReady] = useState(false);
  const uploadCallbackRef = useRef(uploadCallback);

  // Update ref when callback changes
  useEffect(() => {
    uploadCallbackRef.current = uploadCallback;
  }, [uploadCallback]);

  // Initialize cache
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const voiceCache = await getVoiceCache();

        if (uploadCallbackRef.current) {
          voiceCache.setUploadCallback(uploadCallbackRef.current);
        }

        if (mounted) {
          setCache(voiceCache);
          setIsReady(true);

          // Get initial stats
          const initialStats = await voiceCache.getStats();
          setStats(initialStats);
        }
      } catch (error) {
        console.error('Failed to initialize voice cache:', error);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Store recording
  const storeRecording = useCallback(
    async (id: string, blob: Blob, providerId: string) => {
      if (!cache) return;

      await cache.store(id, blob, providerId);
      const newStats = await cache.getStats();
      setStats(newStats);
    },
    [cache]
  );

  // Get recording
  const getRecording = useCallback(
    async (id: string) => {
      if (!cache) return null;
      return cache.get(id);
    },
    [cache]
  );

  // Delete recording
  const deleteRecording = useCallback(
    async (id: string) => {
      if (!cache) return;

      await cache.delete(id);
      const newStats = await cache.getStats();
      setStats(newStats);
    },
    [cache]
  );

  // Sync all
  const syncAll = useCallback(async () => {
    if (!cache) return;

    await cache.syncAll();
    const newStats = await cache.getStats();
    setStats(newStats);
  }, [cache]);

  // Cleanup
  const cleanup = useCallback(async () => {
    if (!cache) return 0;

    const cleaned = await cache.cleanup();
    const newStats = await cache.getStats();
    setStats(newStats);
    return cleaned;
  }, [cache]);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    if (!cache) return;

    const newStats = await cache.getStats();
    setStats(newStats);
  }, [cache]);

  return {
    isReady,
    stats,
    storeRecording,
    getRecording,
    deleteRecording,
    syncAll,
    cleanup,
    refreshStats,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique voice recording ID
 */
export function generateVoiceId(): string {
  return `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert blob to base64 data URL (for small previews)
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get audio duration from blob
 */
export function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Failed to load audio'));
    };
  });
}
