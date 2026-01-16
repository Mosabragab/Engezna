/**
 * Custom Order Storage Service - خدمة تخزين ملفات الطلبات المفتوحة
 *
 * Handles file uploads and downloads for custom orders:
 * - Voice recordings
 * - Images
 * - Structured storage paths
 *
 * Storage structure:
 * custom-orders/
 *   broadcasts/{broadcast_id}/
 *     voice/original.webm
 *     images/1.jpg, 2.jpg, ...
 *   requests/{request_id}/
 *     items/{item_id}/image.jpg
 *
 * @version 1.0
 * @date January 2026
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export interface StorageServiceConfig {
  supabase: AnySupabaseClient;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface MultiUploadResult {
  success: boolean;
  urls?: string[];
  paths?: string[];
  errors?: string[];
}

export type FileCategory = 'voice' | 'image' | 'item-image';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const BUCKET_NAME = 'custom-orders';

const MAX_FILE_SIZES = {
  voice: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024, // 5MB
};

const ALLOWED_MIME_TYPES = {
  voice: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Storage Error
// ═══════════════════════════════════════════════════════════════════════════════

export class StorageError extends Error {
  constructor(
    message: string,
    public code:
      | 'FILE_TOO_LARGE'
      | 'INVALID_TYPE'
      | 'UPLOAD_FAILED'
      | 'DOWNLOAD_FAILED'
      | 'DELETE_FAILED'
      | 'BUCKET_NOT_FOUND'
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Storage Service Class
// ═══════════════════════════════════════════════════════════════════════════════

export class CustomOrderStorageService {
  private supabase: AnySupabaseClient;

  constructor(config: StorageServiceConfig) {
    this.supabase = config.supabase;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Voice Upload
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upload voice recording for a broadcast
   * رفع تسجيل صوتي للبث
   */
  async uploadVoice(
    broadcastId: string,
    file: Blob | File,
    filename?: string
  ): Promise<UploadResult> {
    // Validate file size
    if (file.size > MAX_FILE_SIZES.voice) {
      throw new StorageError(
        `Voice file exceeds maximum size of ${MAX_FILE_SIZES.voice / 1024 / 1024}MB`,
        'FILE_TOO_LARGE'
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.voice.includes(file.type)) {
      throw new StorageError(`Invalid voice file type: ${file.type}`, 'INVALID_TYPE');
    }

    // Determine extension from MIME type
    const ext = this.getExtensionFromMime(file.type);
    const finalFilename = filename || `original${ext}`;
    const path = `broadcasts/${broadcastId}/voice/${finalFilename}`;

    return this.uploadFile(path, file);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Image Upload
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upload images for a broadcast
   * رفع صور للبث
   */
  async uploadBroadcastImages(
    broadcastId: string,
    files: (Blob | File)[]
  ): Promise<MultiUploadResult> {
    const results: UploadResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file size
      if (file.size > MAX_FILE_SIZES.image) {
        errors.push(
          `Image ${i + 1} exceeds maximum size of ${MAX_FILE_SIZES.image / 1024 / 1024}MB`
        );
        continue;
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.image.includes(file.type)) {
        errors.push(`Image ${i + 1} has invalid type: ${file.type}`);
        continue;
      }

      const ext = this.getExtensionFromMime(file.type);
      const path = `broadcasts/${broadcastId}/images/${i + 1}${ext}`;

      try {
        const result = await this.uploadFile(path, file);
        results.push(result);
      } catch (err) {
        errors.push(`Failed to upload image ${i + 1}: ${(err as Error).message}`);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      urls: results.map((r) => r.url!).filter(Boolean),
      paths: results.map((r) => r.path!).filter(Boolean),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Upload item image (for merchant pricing)
   * رفع صورة صنف
   */
  async uploadItemImage(
    requestId: string,
    itemId: string,
    file: Blob | File
  ): Promise<UploadResult> {
    // Validate file size
    if (file.size > MAX_FILE_SIZES.image) {
      throw new StorageError(
        `Image exceeds maximum size of ${MAX_FILE_SIZES.image / 1024 / 1024}MB`,
        'FILE_TOO_LARGE'
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.image.includes(file.type)) {
      throw new StorageError(`Invalid image type: ${file.type}`, 'INVALID_TYPE');
    }

    const ext = this.getExtensionFromMime(file.type);
    const path = `requests/${requestId}/items/${itemId}/image${ext}`;

    return this.uploadFile(path, file);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Download & URL Generation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get public URL for a file
   * الحصول على رابط عام للملف
   */
  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Get signed URL for temporary access (1 hour)
   * الحصول على رابط موقع للوصول المؤقت
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error || !data) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  }

  /**
   * Download file as blob
   * تحميل الملف
   */
  async downloadFile(path: string): Promise<Blob | null> {
    const { data, error } = await this.supabase.storage.from(BUCKET_NAME).download(path);

    if (error || !data) {
      console.error('Error downloading file:', error);
      return null;
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // File Deletion
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Delete a single file
   * حذف ملف واحد
   */
  async deleteFile(path: string): Promise<boolean> {
    const { error } = await this.supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete all files for a broadcast
   * حذف جميع ملفات البث
   */
  async deleteBroadcastFiles(broadcastId: string): Promise<boolean> {
    // List all files in broadcast folder
    const { data: files, error: listError } = await this.supabase.storage
      .from(BUCKET_NAME)
      .list(`broadcasts/${broadcastId}`, {
        limit: 100,
      });

    if (listError) {
      console.error('Error listing broadcast files:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      return true;
    }

    // Delete all files
    const paths = files.map((f) => `broadcasts/${broadcastId}/${f.name}`);
    const { error: deleteError } = await this.supabase.storage.from(BUCKET_NAME).remove(paths);

    if (deleteError) {
      console.error('Error deleting broadcast files:', deleteError);
      return false;
    }

    return true;
  }

  /**
   * Delete all files for a request
   * حذف جميع ملفات الطلب
   */
  async deleteRequestFiles(requestId: string): Promise<boolean> {
    // List all files in request folder
    const { data: files, error: listError } = await this.supabase.storage
      .from(BUCKET_NAME)
      .list(`requests/${requestId}`, {
        limit: 100,
      });

    if (listError) {
      console.error('Error listing request files:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      return true;
    }

    // Delete all files
    const paths = files.map((f) => `requests/${requestId}/${f.name}`);
    const { error: deleteError } = await this.supabase.storage.from(BUCKET_NAME).remove(paths);

    if (deleteError) {
      console.error('Error deleting request files:', deleteError);
      return false;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upload a file to storage
   */
  private async uploadFile(path: string, file: Blob | File): Promise<UploadResult> {
    const { data, error } = await this.supabase.storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: '3600',
      upsert: true, // Overwrite if exists
    });

    if (error) {
      console.error('Upload error:', error);
      throw new StorageError(`Upload failed: ${error.message}`, 'UPLOAD_FAILED');
    }

    const publicUrl = this.getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
      path: data.path,
    };
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMime(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/webm': '.webm',
      'audio/mp4': '.m4a',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/heic': '.heic',
      'image/heif': '.heif',
    };

    return mimeToExt[mimeType] || '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create custom order storage service
 */
export function createCustomOrderStorageService(
  supabase: AnySupabaseClient
): CustomOrderStorageService {
  return new CustomOrderStorageService({ supabase });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique filename with UUID
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || '';
  return `${crypto.randomUUID()}.${ext}`;
}

/**
 * Get broadcast voice path
 */
export function getBroadcastVoicePath(broadcastId: string, filename = 'original.webm'): string {
  return `broadcasts/${broadcastId}/voice/${filename}`;
}

/**
 * Get broadcast images path
 */
export function getBroadcastImagesPath(broadcastId: string): string {
  return `broadcasts/${broadcastId}/images`;
}

/**
 * Get request item image path
 */
export function getItemImagePath(requestId: string, itemId: string, ext = '.jpg'): string {
  return `requests/${requestId}/items/${itemId}/image${ext}`;
}

/**
 * Extract broadcast ID from storage path
 */
export function extractBroadcastIdFromPath(path: string): string | null {
  const match = path.match(/broadcasts\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract request ID from storage path
 */
export function extractRequestIdFromPath(path: string): string | null {
  const match = path.match(/requests\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Validate file before upload (client-side validation)
 */
export function validateFile(
  file: File | Blob,
  category: FileCategory
): { valid: boolean; error?: string } {
  const maxSize = category === 'voice' ? MAX_FILE_SIZES.voice : MAX_FILE_SIZES.image;
  const allowedTypes = category === 'voice' ? ALLOWED_MIME_TYPES.voice : ALLOWED_MIME_TYPES.image;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}
