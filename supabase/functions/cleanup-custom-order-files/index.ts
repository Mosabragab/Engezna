/**
 * Cleanup Custom Order Files - Edge Function
 * حذف ملفات الطلبات الخاصة القديمة
 *
 * This function:
 * 1. Fetches broadcasts marked for cleanup
 * 2. Deletes voice recordings and images from storage
 * 3. Clears file URLs from database
 * 4. Logs cleanup results
 *
 * Should be called weekly via cron job or manual trigger.
 *
 * @version 1.0
 * @date January 2026
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET_NAME = 'custom-orders';

interface BroadcastToCleanup {
  broadcast_id: string;
  voice_url: string | null;
  image_urls: string[] | null;
}

interface CleanupStats {
  broadcastsProcessed: number;
  voiceFilesDeleted: number;
  imageFilesDeleted: number;
  storageFreedMb: number;
  errors: string[];
}

serve(async (req: Request) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    console.log('Starting custom order files cleanup...');

    // Get broadcasts marked for cleanup
    const { data: broadcasts, error: fetchError } = await supabase.rpc(
      'mark_broadcasts_for_cleanup'
    );

    if (fetchError) {
      console.error('Error fetching broadcasts for cleanup:', fetchError);
      throw new Error(`Failed to fetch broadcasts: ${fetchError.message}`);
    }

    const stats: CleanupStats = {
      broadcastsProcessed: 0,
      voiceFilesDeleted: 0,
      imageFilesDeleted: 0,
      storageFreedMb: 0,
      errors: [],
    };

    if (!broadcasts || broadcasts.length === 0) {
      console.log('No broadcasts to clean up');

      // Log empty run
      await supabase.rpc('log_cleanup_result', {
        p_broadcasts: 0,
        p_voice_files: 0,
        p_image_files: 0,
        p_storage_mb: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No broadcasts to clean up',
          stats,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${broadcasts.length} broadcasts to clean up`);

    // Process each broadcast
    for (const broadcast of broadcasts as BroadcastToCleanup[]) {
      try {
        const filesToDelete: string[] = [];

        // Extract path from voice URL
        if (broadcast.voice_url) {
          const voicePath = extractPathFromUrl(broadcast.voice_url);
          if (voicePath) {
            filesToDelete.push(voicePath);
            stats.voiceFilesDeleted++;
          }
        }

        // Extract paths from image URLs
        if (broadcast.image_urls && broadcast.image_urls.length > 0) {
          for (const imageUrl of broadcast.image_urls) {
            const imagePath = extractPathFromUrl(imageUrl);
            if (imagePath) {
              filesToDelete.push(imagePath);
              stats.imageFilesDeleted++;
            }
          }
        }

        // Delete files from storage
        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filesToDelete);

          if (deleteError) {
            console.error(
              `Error deleting files for broadcast ${broadcast.broadcast_id}:`,
              deleteError
            );
            stats.errors.push(`Broadcast ${broadcast.broadcast_id}: ${deleteError.message}`);
          } else {
            console.log(
              `Deleted ${filesToDelete.length} files for broadcast ${broadcast.broadcast_id}`
            );
          }
        }

        // Clear file URLs from database
        await supabase.rpc('clear_broadcast_file_urls', {
          p_broadcast_id: broadcast.broadcast_id,
        });

        stats.broadcastsProcessed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing broadcast ${broadcast.broadcast_id}:`, errorMessage);
        stats.errors.push(`Broadcast ${broadcast.broadcast_id}: ${errorMessage}`);
      }
    }

    // Log cleanup results
    await supabase.rpc('log_cleanup_result', {
      p_broadcasts: stats.broadcastsProcessed,
      p_voice_files: stats.voiceFilesDeleted,
      p_image_files: stats.imageFilesDeleted,
      p_storage_mb: stats.storageFreedMb,
      p_errors: stats.errors.length > 0 ? stats.errors : null,
    });

    console.log('Cleanup completed:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${stats.broadcastsProcessed} broadcasts`,
        stats,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Cleanup error:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Extract storage path from public URL
 */
function extractPathFromUrl(url: string): string | null {
  try {
    // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }

    // Alternative format: direct path
    if (url.startsWith('broadcasts/') || url.startsWith('requests/')) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}
