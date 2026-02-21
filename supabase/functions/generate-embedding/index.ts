import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MenuItem {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  provider_id: string;
  category_id: string | null;
  providers?: { name_ar: string };
  provider_categories?: { name_ar: string };
}

interface EmbeddingRequest {
  item_id?: string; // Single item
  item_ids?: string[]; // Batch processing
  mode?: 'single' | 'batch' | 'catchup'; // Operation mode
  limit?: number; // For catchup mode
}

/**
 * Build searchable text from menu item data
 * Includes item name, description, category, and provider for better semantic search
 */
function buildEmbeddingText(item: MenuItem): string {
  const parts: string[] = [];

  // Item name (Arabic and English)
  if (item.name_ar) parts.push(item.name_ar);
  if (item.name_en) parts.push(item.name_en);

  // Description
  if (item.description_ar) parts.push(item.description_ar);
  if (item.description_en) parts.push(item.description_en);

  // Category name for context
  if (item.provider_categories?.name_ar) {
    parts.push(`قسم: ${item.provider_categories.name_ar}`);
  }

  // Provider name for context
  if (item.providers?.name_ar) {
    parts.push(`من: ${item.providers.name_ar}`);
  }

  // Price context (helps with "cheap" / "expensive" queries)
  if (item.price) {
    parts.push(`السعر: ${item.price} جنيه`);
  }

  return parts.join(' | ');
}

/**
 * Generate embedding using OpenAI's text-embedding-3-small model
 */
async function generateEmbedding(text: string, openaiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536, // Default dimension for text-embedding-3-small
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const body: EmbeddingRequest = await req.json();
    const { item_id, item_ids, mode = 'single', limit = 100 } = body;

    let itemsToProcess: MenuItem[] = [];

    // Determine which items to process
    if (mode === 'catchup') {
      // Get items without embeddings
      const { data, error } = await supabase
        .from('menu_items')
        .select(
          `
          id, name_ar, name_en, description_ar, description_en, price, provider_id, category_id,
          providers(name_ar),
          provider_categories!category_id(name_ar)
        `
        )
        .is('embedding', null)
        .eq('is_available', true)
        .limit(limit);

      if (error) throw error;
      itemsToProcess = (data as unknown as MenuItem[]) || [];
      console.warn(`Catchup mode: Found ${itemsToProcess.length} items without embeddings`);
    } else if (item_ids && item_ids.length > 0) {
      // Batch mode
      const { data, error } = await supabase
        .from('menu_items')
        .select(
          `
          id, name_ar, name_en, description_ar, description_en, price, provider_id, category_id,
          providers(name_ar),
          provider_categories!category_id(name_ar)
        `
        )
        .in('id', item_ids);

      if (error) throw error;
      itemsToProcess = (data as unknown as MenuItem[]) || [];
      console.warn(`Batch mode: Processing ${itemsToProcess.length} items`);
    } else if (item_id) {
      // Single item mode
      const { data, error } = await supabase
        .from('menu_items')
        .select(
          `
          id, name_ar, name_en, description_ar, description_en, price, provider_id, category_id,
          providers(name_ar),
          provider_categories!category_id(name_ar)
        `
        )
        .eq('id', item_id)
        .single();

      if (error) throw error;
      if (data) {
        itemsToProcess = [data as unknown as MenuItem];
      }
      console.warn(`Single mode: Processing item ${item_id}`);
    } else {
      throw new Error('No items specified. Provide item_id, item_ids, or mode=catchup');
    }

    if (itemsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No items to process',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each item
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of itemsToProcess) {
      try {
        // Build text for embedding
        const embeddingText = buildEmbeddingText(item);

        // Generate embedding
        const embedding = await generateEmbedding(embeddingText, OPENAI_API_KEY);

        // Store embedding in database
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({
            embedding: embedding,
            embedding_text: embeddingText,
            embedding_updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          throw updateError;
        }

        results.processed++;
        console.warn(`Generated embedding for item ${item.id}: ${item.name_ar}`);
      } catch (itemError) {
        results.failed++;
        const errorMsg = `Item ${item.id}: ${(itemError as Error).message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }

      // Rate limiting: small delay between API calls
      if (itemsToProcess.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        message: `Processed ${results.processed} items, ${results.failed} failed`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 200, // Return 200 to avoid Supabase error masking
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
