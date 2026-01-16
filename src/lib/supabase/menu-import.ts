/**
 * Menu Import Database Operations
 * Handles CRUD operations for menu_imports table
 */

import { createClient } from './client';
import type {
  MenuImport,
  ImportStatus,
  UploadedImage,
  ExtractedCategory,
  ExtractedAddon,
  AnalysisWarning,
  AnalysisStatistics,
} from '@/types/menu-import';

// Create a new import session
export async function createMenuImport(providerId: string): Promise<{
  data: MenuImport | null;
  error: string | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('menu_imports')
    .insert({
      provider_id: providerId,
      status: 'uploading',
      uploaded_images: [],
      extracted_data: {
        categories: [],
        addons: [],
        warnings: [],
        statistics: {
          total_categories: 0,
          total_products: 0,
          products_single_price: 0,
          products_with_variants: 0,
          products_need_review: 0,
          average_confidence: 0,
          addons_found: 0,
        },
      },
      total_items: 0,
      reviewed_items: 0,
      products_created: 0,
      products_with_variants: 0,
      retry_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating menu import:', error);
    return { data: null, error: error.message };
  }

  return { data: data as MenuImport, error: null };
}

// Get import by ID
export async function getMenuImport(importId: string): Promise<{
  data: MenuImport | null;
  error: string | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('menu_imports')
    .select('*')
    .eq('id', importId)
    .single();

  if (error) {
    console.error('Error fetching menu import:', error);
    return { data: null, error: error.message };
  }

  return { data: data as MenuImport, error: null };
}

// Update import status
export async function updateImportStatus(
  importId: string,
  status: ImportStatus,
  additionalData?: Partial<MenuImport>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Add timestamp based on status
  switch (status) {
    case 'processing':
      updateData.processing_started_at = new Date().toISOString();
      break;
    case 'review':
      updateData.processing_completed_at = new Date().toISOString();
      updateData.review_started_at = new Date().toISOString();
      break;
    case 'completed':
      updateData.completed_at = new Date().toISOString();
      break;
  }

  if (additionalData) {
    Object.assign(updateData, additionalData);
  }

  const { error } = await supabase.from('menu_imports').update(updateData).eq('id', importId);

  if (error) {
    console.error('Error updating import status:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Add uploaded images
export async function addUploadedImages(
  importId: string,
  images: UploadedImage[]
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  // Get current images
  const { data: current, error: fetchError } = await supabase
    .from('menu_imports')
    .select('uploaded_images')
    .eq('id', importId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const currentImages = (current?.uploaded_images || []) as UploadedImage[];
  const updatedImages = [...currentImages, ...images];

  const { error } = await supabase
    .from('menu_imports')
    .update({
      uploaded_images: updatedImages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', importId);

  if (error) {
    console.error('Error adding uploaded images:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Save extracted data from AI analysis
export async function saveExtractedData(
  importId: string,
  data: {
    categories: ExtractedCategory[];
    addons: ExtractedAddon[];
    warnings: AnalysisWarning[];
    statistics: AnalysisStatistics;
  },
  aiInfo?: {
    rawResponse?: string;
    modelUsed?: string;
    processingTimeMs?: number;
    tokensUsed?: { input: number; output: number };
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  // Calculate total items
  let totalItems = 0;
  data.categories.forEach((cat) => {
    totalItems += cat.products.length;
  });
  totalItems += data.addons.length;

  const updateData: Record<string, unknown> = {
    status: 'review',
    extracted_data: data,
    total_items: totalItems,
    processing_completed_at: new Date().toISOString(),
    review_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (aiInfo) {
    if (aiInfo.rawResponse) {
      updateData.ai_raw_response = { text: aiInfo.rawResponse };
    }
    if (aiInfo.modelUsed) {
      updateData.ai_model_used = aiInfo.modelUsed;
    }
    if (aiInfo.processingTimeMs !== undefined) {
      updateData.ai_processing_time_ms = aiInfo.processingTimeMs;
    }
    if (aiInfo.tokensUsed) {
      updateData.ai_tokens_used = aiInfo.tokensUsed;
    }
  }

  const { error } = await supabase.from('menu_imports').update(updateData).eq('id', importId);

  if (error) {
    console.error('Error saving extracted data:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Save final reviewed data
export async function saveFinalData(
  importId: string,
  finalData: {
    categories: ExtractedCategory[];
    addons: ExtractedAddon[];
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  // Calculate reviewed items
  let reviewedItems = 0;
  finalData.categories.forEach((cat) => {
    cat.products.forEach((prod) => {
      if (prod.isConfirmed || prod.isEdited) {
        reviewedItems++;
      }
    });
  });

  const { error } = await supabase
    .from('menu_imports')
    .update({
      status: 'saving',
      final_data: finalData,
      reviewed_items: reviewedItems,
      updated_at: new Date().toISOString(),
    })
    .eq('id', importId);

  if (error) {
    console.error('Error saving final data:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Mark import as completed
export async function completeImport(
  importId: string,
  results: {
    savedCategoryIds: string[];
    savedProductIds: string[];
    productsCreated: number;
    productsWithVariants: number;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('menu_imports')
    .update({
      status: 'completed',
      saved_category_ids: results.savedCategoryIds,
      saved_product_ids: results.savedProductIds,
      products_created: results.productsCreated,
      products_with_variants: results.productsWithVariants,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', importId);

  if (error) {
    console.error('Error completing import:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Mark import as failed
export async function failImport(
  importId: string,
  errorMessage: string,
  errorDetails?: object
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('menu_imports')
    .update({
      status: 'failed',
      error_message: errorMessage,
      error_details: errorDetails || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', importId);

  if (error) {
    console.error('Error marking import as failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Cancel import
export async function cancelImport(importId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = createClient();

  const { error } = await supabase
    .from('menu_imports')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', importId);

  if (error) {
    console.error('Error cancelling import:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Get provider's import history
export async function getProviderImports(providerId: string): Promise<{
  data: MenuImport[] | null;
  error: string | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('menu_imports')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching provider imports:', error);
    return { data: null, error: error.message };
  }

  return { data: data as MenuImport[], error: null };
}

// Retry failed import (increment retry count)
export async function retryImport(importId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = createClient();

  // Get current retry count
  const { data: current, error: fetchError } = await supabase
    .from('menu_imports')
    .select('retry_count')
    .eq('id', importId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const newRetryCount = (current?.retry_count || 0) + 1;

  const { error } = await supabase
    .from('menu_imports')
    .update({
      status: 'uploading',
      retry_count: newRetryCount,
      error_message: null,
      error_details: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', importId);

  if (error) {
    console.error('Error retrying import:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
