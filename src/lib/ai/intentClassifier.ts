/**
 * GPT-based Intent Classifier
 * Replaces all regex-based pattern matching with AI understanding
 * Handles typos, dialects, and natural language variations
 */

import { OpenAI } from 'openai'

// All supported intents
export type IntentType =
  | 'search_product'      // البحث عن منتج
  | 'product_info'        // سؤال عن وصف/مكونات منتج معين
  | 'show_menu'           // طلب عرض المنيو
  | 'cart_inquiry'        // استفسار عن السلة
  | 'remove_item'         // حذف صنف من السلة
  | 'clear_cart'          // مسح السلة كلها
  | 'cancel'              // إلغاء/رجوع
  | 'delivery_info'       // استفسار عن التوصيل
  | 'confirm'             // تأكيد
  | 'quantity_response'   // رد بالكمية
  | 'go_to_cart'          // الذهاب للسلة
  | 'greeting'            // تحية
  | 'thanks'              // شكر
  | 'help'                // مساعدة
  | 'unknown'             // غير معروف - يمر لـ GPT العادي

export interface ClassifiedIntent {
  intent: IntentType
  confidence: number
  entities: {
    product_name?: string      // اسم المنتج للبحث أو الحذف
    quantity?: number          // الكمية
    provider_name?: string     // اسم المتجر
  }
  original_message: string
}

// Intent classification prompt
const INTENT_CLASSIFICATION_PROMPT = `أنت مصنف نوايا (Intent Classifier) لتطبيق توصيل طعام مصري.

مهمتك: حدد نية المستخدم من رسالته وأي كيانات (entities) مذكورة.

الأنواع المتاحة:
- search_product: يبحث عن منتج أو أكل (مثال: "عايز بيتزا"، "ابحث عن برجر"، "فين الكشري"، "ممكن شاورما")
- product_info: يسأل عن وصف أو مكونات منتج معين - مش بيدور عليه! (أمثلة كتير:)
  * "بيتزا نيويورك عبارة عن ايه"
  * "الكشري فيه ايه"
  * "مكونات البرجر"
  * "الطبق ده بيتكون من ايه"
  * "X ايه مكوناته" أو "X ايه مكوناتها"
  * "ايه مكونات X"
  * "ايه مكوناتها" (سؤال عن المنتج الحالي)
  * "ايه مكوناته"
  * "مكوناتها ايه"
  * "فيها ايه" أو "فيه ايه"
  * "وصفها ايه" أو "وصفه ايه"
  * "ده فيه ايه"
  * "بيتكون من ايه"
- show_menu: يريد عرض المنيو/قائمة الأصناف (مثال: "عايز المنيو"، "هاتلي المنيو"، "شوفلي الأصناف"، "ورني القائمة"، "عندكم ايه")
- cart_inquiry: يسأل عن محتوى السلة (مثال: "ايه في السلة"، "عندي ايه"، "السلة فيها ايه")
- remove_item: يريد حذف صنف معين من السلة (مثال: "امسح البيتزا"، "شيل الكولا"، "الغي البرجر من السلة")
- clear_cart: يريد مسح السلة كلها (مثال: "امسح السلة"، "فضي الكارت"، "الغي الطلب كله")
- cancel: يريد إلغاء أو رجوع (مثال: "لا مش عايز"، "الغي"، "رجعني")
- delivery_info: يسأل عن التوصيل أو الشحن أو رسوم التوصيل (مثال: "بكام التوصيل"، "التوصيل بكام"، "الدليفري كام"، "كام التوصيل"، "في توصيل"، "رسوم التوصيل"، "سعر التوصيل"، "التوصيل مجاني؟")
- confirm: يؤكد طلب (مثال: "اه"، "تمام"، "اكيد"، "موافق")
- quantity_response: يرد بكمية (مثال: "2"، "اتنين"، "واحد"، "3 حبات")
- go_to_cart: يريد الذهاب للسلة/الدفع (مثال: "روح للسلة"، "خلص الطلب"، "ادفع")
- greeting: تحية (مثال: "مرحبا"، "ازيك"، "صباح الخير")
- thanks: شكر (مثال: "شكرا"، "تسلم"، "الله يعطيك العافية")
- help: طلب مساعدة (مثال: "ساعدني"، "مش فاهم"، "ازاي اطلب")
- unknown: أي شيء آخر غير واضح

تحذير مهم جداً:
- لو المستخدم بيسأل عن مكونات أو وصف منتج (حتى لو كتب اسمه غلط) ← ده product_info!
- الكلمات دي تدل على product_info: "مكونات"، "مكوناته"، "مكوناتها"، "عبارة عن"، "فيه ايه"، "فيها ايه"، "بيتكون"، "وصف"، "وصفه"، "وصفها"
- "ايه مكوناتها" أو "ايه مكوناته" = product_info (بيسأل عن المنتج اللي قدامه)
- product_info = سؤال عن وصف/مكونات
- search_product = بحث عن منتج عايز يطلبه

ملاحظات مهمة:
1. المصريين بيكتبوا بأخطاء إملائية كتير (امس = امسح، شيله = شيل، الغيه = الغي، كونات = مكونات)
2. اللهجة المصرية: "عايز"، "عاوز"، "نفسي في"، "جيبلي"، "هاتلي"
3. لو الرسالة فيها اسم منتج، استخرجه في product_name (حتى لو فيه أخطاء إملائية)
4. لو فيها رقم أو كمية، استخرجها في quantity

رد بـ JSON فقط بالشكل ده:
{"intent": "النوع", "confidence": 0.9, "entities": {"product_name": "اسم المنتج لو موجود", "quantity": الرقم لو موجود}}`

// Lazy OpenAI client
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

/**
 * Classify user intent using GPT
 * Uses gpt-4o-mini for fast, cheap classification
 */
export async function classifyIntent(
  message: string,
  context?: {
    hasCartItems?: boolean
    hasSelectedProvider?: boolean
    awaitingQuantity?: boolean
    awaitingConfirmation?: boolean
    currentItemName?: string    // اسم المنتج الحالي لو موجود
  }
): Promise<ClassifiedIntent> {
  const openai = getOpenAI()

  // Add context hints to help classification
  let contextHint = ''
  if (context?.awaitingQuantity && context?.currentItemName) {
    contextHint = `\n\nالسياق: المستخدم بيختار كمية للمنتج "${context.currentItemName}" - لو سأل "ايه مكوناتها" أو "فيه ايه" يبقى بيسأل عن المنتج ده`
  } else if (context?.awaitingConfirmation && context?.currentItemName) {
    contextHint = `\n\nالسياق: المستخدم بيأكد طلب "${context.currentItemName}" - لو سأل عن المكونات يبقى بيسأل عن المنتج ده`
  } else if (context?.awaitingQuantity) {
    contextHint = '\n\nالسياق: المستخدم مستني يقول الكمية'
  } else if (context?.awaitingConfirmation) {
    contextHint = '\n\nالسياق: المستخدم مستني يأكد الطلب'
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INTENT_CLASSIFICATION_PROMPT + contextHint },
        { role: 'user', content: message }
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 150,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(content)

    return {
      intent: parsed.intent || 'unknown',
      confidence: parsed.confidence || 0.5,
      entities: {
        product_name: parsed.entities?.product_name,
        quantity: parsed.entities?.quantity ? Number(parsed.entities.quantity) : undefined,
        provider_name: parsed.entities?.provider_name,
      },
      original_message: message,
    }
  } catch (error) {
    console.error('Intent classification error:', error)
    // Fallback to unknown - let the main GPT handle it
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {},
      original_message: message,
    }
  }
}

/**
 * Quick check if message is a payload (button click)
 * Payloads don't need intent classification
 */
export function isPayload(message: string): boolean {
  const payloadPrefixes = [
    'provider:', 'item:', 'variant:', 'category:',
    'provider_category:', 'add_more:', 'confirm_add',
    'clear_cart', 'go_to_cart', 'cart_inquiry',
    'cancel_item', 'clear_cart_and_add', 'remove_item:',
    'navigate:', 'search:', 'reorder:', 'show_promotions',
    'show_popular', 'show_nearby', 'reorder_last',
  ]

  return payloadPrefixes.some(prefix => message.startsWith(prefix)) ||
         message === 'categories' ||
         message === 'confirm_add' ||
         message === 'cancel_item'
}

/**
 * Parse quantity from message (handles Arabic numbers and words)
 */
export function parseQuantity(message: string): number | null {
  const trimmed = message.trim().toLowerCase()

  // Arabic word numbers
  const arabicNumbers: Record<string, number> = {
    'واحد': 1, 'واحده': 1, 'واحدة': 1,
    'اتنين': 2, 'اثنين': 2, 'تنين': 2,
    'تلاته': 3, 'ثلاثه': 3, 'ثلاثة': 3, 'تلاتة': 3,
    'اربعه': 4, 'أربعه': 4, 'أربعة': 4, 'اربعة': 4,
    'خمسه': 5, 'خمسة': 5,
    'سته': 6, 'ستة': 6,
    'سبعه': 7, 'سبعة': 7,
    'تمنيه': 8, 'ثمانية': 8, 'تمانية': 8,
    'تسعه': 9, 'تسعة': 9,
    'عشره': 10, 'عشرة': 10,
  }

  if (arabicNumbers[trimmed]) {
    return arabicNumbers[trimmed]
  }

  // Numeric (Arabic or English digits)
  const numericMatch = trimmed
    .replace(/[٠]/g, '0').replace(/[١]/g, '1').replace(/[٢]/g, '2')
    .replace(/[٣]/g, '3').replace(/[٤]/g, '4').replace(/[٥]/g, '5')
    .replace(/[٦]/g, '6').replace(/[٧]/g, '7').replace(/[٨]/g, '8')
    .replace(/[٩]/g, '9')
    .match(/^(\d+)$/)

  if (numericMatch) {
    const num = parseInt(numericMatch[1], 10)
    if (num > 0 && num <= 99) return num
  }

  return null
}
