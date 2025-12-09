import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MENU_ANALYSIS_SYSTEM_PROMPT = `أنت محلل منيوهات خبير متخصص في المطاعم والكافيهات والمحلات المصرية والعربية.

# المهمة
حلل صورة/صور المنيو واستخرج:
1. جميع الأقسام (Categories)
2. جميع المنتجات مع أسعارها
3. المنتجات ذات الأحجام/الأوزان المتعددة
4. الإضافات إن وجدت

# قواعد الأسعار

## سعر واحد
شاورما ... 35 → pricing_type: "single", price: 35, variants: null

## سعرين (عادي/كبير)
كريب ... 75/90 → pricing_type: "options", price: 75, variants: [{name_ar: "عادي", price: 75, is_default: true}, {name_ar: "كبير", price: 90}]

## ثلاثة أحجام (S/M/L)
بيتزا ... 80/100/130 → pricing_type: "sizes", price: 80, variants: [{name_ar: "صغير", price: 80, is_default: true}, {name_ar: "وسط", price: 100}, {name_ar: "كبير", price: 130}]

## بالوزن
كباب ... ربع:200/نص:380/كيلو:700 → pricing_type: "weights", variants: [{name_ar: "ربع كيلو", price: 200, is_default: true}, ...]

# تنسيق الإخراج - JSON فقط:
{
  "success": true,
  "categories": [
    {
      "name_ar": "الساندوتشات",
      "name_en": "Sandwiches",
      "icon": "🥙",
      "display_order": 1,
      "products": [
        {
          "name_ar": "شاورما فراخ",
          "name_en": "Chicken Shawarma",
          "description_ar": null,
          "pricing_type": "single",
          "price": 35,
          "original_price": null,
          "variants": null,
          "combo_contents_ar": null,
          "is_popular": false,
          "is_spicy": false,
          "is_vegetarian": false,
          "confidence": 0.95,
          "needs_review": false
        }
      ]
    }
  ],
  "addons": [],
  "warnings": [],
  "statistics": {
    "total_categories": 0,
    "total_products": 0,
    "products_with_variants": 0,
    "products_need_review": 0,
    "average_confidence": 0.95
  }
}

⚠️ أعد JSON فقط بدون أي نص قبله أو بعده.`

const BUSINESS_TYPE_NAMES: Record<string, string> = {
  'restaurant_cafe': 'مطعم وكافيه',
  'coffee_patisserie': 'محل بن وحلويات',
  'grocery': 'سوبر ماركت',
  'vegetables_fruits': 'خضروات وفواكه',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate environment first
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY secret is not configured')
      throw new Error('Server configuration error: CLAUDE_API_KEY not set. Please add it in Supabase Dashboard > Project Settings > Edge Functions > Secrets')
    }
    console.log('CLAUDE_API_KEY is configured (length:', CLAUDE_API_KEY.length, ')')

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      throw new Error('Invalid request body: ' + (parseError as Error).message)
    }

    const { imageUrls, businessType, importId } = body

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('No images provided or invalid imageUrls format')
    }

    console.log(`Processing ${imageUrls.length} images for ${businessType}, importId: ${importId}`)

    // Fetch images and convert to base64
    const imageBlocks = []
    for (const url of imageUrls) {
      try {
        console.log(`Fetching image: ${url}`)
        const response = await fetch(url)
        if (!response.ok) {
          console.error(`Failed to fetch image ${url}: ${response.status}`)
          continue // Skip failed images instead of throwing
        }

        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // Use Deno standard library for base64 encoding
        const base64 = base64Encode(uint8Array)

        const contentType = response.headers.get('content-type') || 'image/jpeg'
        let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
        if (contentType.includes('png')) mediaType = 'image/png'
        else if (contentType.includes('webp')) mediaType = 'image/webp'
        else if (contentType.includes('gif')) mediaType = 'image/gif'

        imageBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64,
          },
        })
        console.log(`Successfully processed image: ${url} (${(uint8Array.length / 1024).toFixed(1)} KB)`)
      } catch (imgError) {
        console.error(`Error processing image ${url}:`, imgError)
        // Continue with other images
      }
    }

    if (imageBlocks.length === 0) {
      throw new Error('No images could be processed')
    }

    const businessTypeAr = BUSINESS_TYPE_NAMES[businessType] || businessType

    console.log(`Calling Claude API with ${imageBlocks.length} images...`)
    const startTime = Date.now()

    const requestBody = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      system: MENU_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: `حلل صورة/صور المنيو المرفقة بدقة.\n\nنوع المتجر: ${businessTypeAr}\nالعملة: جنيه مصري\n\nأعد JSON فقط.`,
            },
          ],
        },
      ],
    }

    console.log('Request body prepared, sending to Claude...')

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    })

    const processingTimeMs = Date.now() - startTime
    console.log(`Claude API responded in ${processingTimeMs}ms`)

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error status:', claudeResponse.status)
      console.error('Claude API error body:', errorText)

      // Parse error for better messaging
      let errorDetail = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetail = errorJson.error?.message || errorJson.message || errorText
      } catch {
        // Use raw text
      }

      throw new Error(`Claude API error (${claudeResponse.status}): ${errorDetail}`)
    }

    const claudeData = await claudeResponse.json()

    // Extract text content
    const textContent = claudeData.content?.find((block: any) => block.type === 'text')
    if (!textContent?.text) {
      throw new Error('No text response from Claude')
    }

    console.log('Raw response length:', textContent.text.length)

    // Parse JSON from response
    let jsonText = textContent.text.trim()

    // Try to extract JSON if there's extra text
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/)
      if (!match) {
        console.error('Invalid response:', jsonText.substring(0, 500))
        throw new Error('Could not find JSON in AI response')
      }
      jsonText = match[0]
    }

    let result
    try {
      result = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Attempted to parse:', jsonText.substring(0, 500))
      throw new Error(`Invalid JSON from AI: ${(parseError as Error).message}`)
    }

    // Ensure statistics has average_confidence
    if (result.statistics && !result.statistics.average_confidence) {
      let totalConfidence = 0
      let productCount = 0
      result.categories?.forEach((cat: any) => {
        cat.products?.forEach((prod: any) => {
          if (prod.confidence) {
            totalConfidence += prod.confidence
            productCount++
          }
        })
      })
      result.statistics.average_confidence = productCount > 0 ? totalConfidence / productCount : 0.9
    }

    // Add metadata
    result.processingTimeMs = processingTimeMs
    result.tokensUsed = {
      input: claudeData.usage?.input_tokens || 0,
      output: claudeData.usage?.output_tokens || 0,
    }

    console.log(`Success! Found ${result.statistics?.total_categories || 0} categories, ${result.statistics?.total_products || 0} products`)

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error occurred'
    const errorStack = (error as Error).stack || ''
    console.error('Error:', errorMessage)
    console.error('Stack:', errorStack)

    // Return 200 with success: false to avoid Supabase Edge Function error handling issues
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorDetails: errorStack.substring(0, 500),
        categories: [],
        addons: [],
        warnings: [],
        statistics: {
          total_categories: 0,
          total_products: 0,
          products_with_variants: 0,
          products_need_review: 0,
          average_confidence: 0,
        }
      }),
      {
        status: 200, // Return 200 so Supabase doesn't mask the error
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
