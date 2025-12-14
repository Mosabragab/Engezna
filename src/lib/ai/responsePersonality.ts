/**
 * AI Response Personality Module
 * Makes the assistant sound more natural and human-like
 * Like a friendly order-taker at a restaurant
 */

// =============================================================================
// RESPONSE VARIATIONS - Different ways to say the same thing
// =============================================================================

export const GREETINGS = [
  'أهلاً بيك! 👋 النهارده عايز تاكل إيه؟',
  'اتفضل يا فندم! 😊 قولي عايز إيه وأنا تحت أمرك',
  'أهلاً! عندنا عروض حلوة النهارده، تحب تشوفها ولا تطلب على طول؟',
  'يا هلا! 👋 جاهز أساعدك تطلب أكلك المفضل',
  'أهلاً وسهلاً! إيه اللي نفسك فيه النهارده؟ 🍽️',
]

export const PROVIDER_SELECTED = [
  (name: string, rating?: number) => `اختيار ممتاز! ${name} ${rating ? `⭐${rating}` : ''} من أحسن الأماكن عندنا. عايز تطلب إيه؟`,
  (name: string, rating?: number) => `تمام! ${name} ${rating ? `⭐${rating}` : ''} 👌 قولي عايز إيه وهلاقيهولك`,
  (name: string, rating?: number) => `أيوه ${name} ${rating ? `⭐${rating}` : ''} عندهم أكل جميل! عايز تشوف المنيو ولا تقولي اسم الصنف؟`,
  (name: string, rating?: number) => `حلو! ${name} ${rating ? `⭐${rating}` : ''} 🔥 اكتب اسم الصنف اللي نفسك فيه`,
]

export const ITEM_FOUND = [
  (item: string, provider: string) => `أيوه لقيته! ${item} موجود عند ${provider} 👇`,
  (item: string, provider: string) => `تمام، ${item} موجود في ${provider}. اختار اللي يعجبك 👇`,
  (item: string, provider: string) => `أهو ${item} عند ${provider}! 😋`,
  (item: string, provider: string) => `لقيتلك ${item} في ${provider}، اتفضل 👇`,
]

export const ITEM_NOT_FOUND = [
  (item: string, provider?: string) => provider
    ? `للأسف مش لاقي ${item} في ${provider} 😕 تحب أدورلك في مكان تاني؟`
    : `مش لاقي ${item} دلوقتي 😕 جرب تكتبه بطريقة تانية أو اختار من الأقسام`,
  (item: string, provider?: string) => provider
    ? `${item} مش موجود عند ${provider}. بس ممكن يكون في مكان تاني، تحب أدور؟`
    : `معلش، ${item} مش متاح حالياً. تحب تجرب حاجة تانية؟`,
]

export const QUANTITY_ASK = [
  (item: string, price: number) => `${item} بـ ${price} ج.م 🍽️\n\nكام واحدة تحب؟`,
  (item: string, price: number) => `تمام، ${item} بـ ${price} جنيه. هتاخد كام؟`,
  (item: string, price: number) => `${item} (${price} ج.م) - عايز كام واحدة؟`,
]

export const VARIANT_ASK = [
  (item: string) => `${item} له أحجام مختلفة، اختار اللي يناسبك 👇`,
  (item: string) => `تمام! ${item} متاح بأكتر من حجم. إيه اللي تفضله؟`,
  (item: string) => `${item} عندنا منه أحجام مختلفة، اختار براحتك 👇`,
]

export const ADDED_TO_CART = [
  (qty: number, item: string, price: number, provider: string) =>
    `تمام! ✅ ضفت ${qty}x ${item} للسلة من ${provider} (${price} ج.م)`,
  (qty: number, item: string, price: number, provider: string) =>
    `حلو! ✅ ${qty} ${item} اتضافوا للسلة (${price} ج.م) من ${provider}`,
  (qty: number, item: string, price: number, provider: string) =>
    `تم! ✅ ${qty}x ${item} في السلة دلوقتي (${price} ج.م)`,
]

export const UPSELL_SUGGESTIONS = [
  (items: string[]) => `تحب تضيف معاهم ${items.join(' أو ')}؟ 😋`,
  (items: string[]) => `ناس كتير بتاخد معاها ${items[0]}، تحب تجرب؟`,
  (items: string[]) => `إيه رأيك تضيف ${items[0]} كمان؟ هيكمل الأوردر 👌`,
]

export const CART_EMPTY = [
  'السلة فاضية دلوقتي 🛒 تحب تبدأ تطلب؟',
  'مفيش حاجة في السلة لسه. يلا نبدأ نطلب! 🛒',
  'السلة فاضية! عايز تشوف الأقسام ولا تدور على حاجة معينة؟',
]

export const CART_CLEARED = [
  '🗑️ تمام، السلة اتفضت! عايز تبدأ طلب جديد؟',
  '🗑️ خلاص، مسحت كل حاجة. نبدأ من الأول؟',
  '🗑️ السلة فضيت. عايز تطلب حاجة تانية؟',
]

export const CANCEL_RESPONSES = {
  variant: [
    'تمام، خلينا نرجع للصنف. عايز تختار حجم تاني؟',
    'ماشي، مش مشكلة. اختار حجم تاني 👇',
  ],
  item: [
    'تمام، الصنف اتشال. عايز تشوف حاجة تانية؟',
    'خلاص، شلته. تحب تكمل في نفس المكان؟',
  ],
  provider: [
    'تمام، عايز تشوف مكان تاني؟',
    'ماشي، خلينا نشوف أماكن تانية 👇',
  ],
  nothing: [
    'مفيش حاجة تتلغي 😊 تحب تبدأ طلب جديد؟',
    'السلة فاضية أصلاً! يلا نطلب حاجة؟',
  ],
}

export const DELIVERY_INFO = {
  free: (provider: string) => `✅ التوصيل مجاني من ${provider}! 🎉`,
  paid: (provider: string, fee: number) => `🚚 التوصيل من ${provider} بـ ${fee} ج.م`,
  freeAbove: (threshold: number) => `🎁 توصيل مجاني للطلبات فوق ${threshold} ج.م`,
  minOrder: (amount: number) => `📦 الحد الأدنى للطلب: ${amount} ج.م`,
  time: (minutes: number) => `⏱️ التوصيل في حدود ${minutes} دقيقة`,
}

export const RECOMMENDATIONS = {
  withProvider: (provider: string) => [
    `⭐ دي أحلى الأصناف عند ${provider}:`,
    `🔥 الأكثر طلباً من ${provider}:`,
    `👨‍🍳 ${provider} بينصحك بـ:`,
  ],
  general: [
    '⭐ دي أحسن الأماكن المتاحة دلوقتي:',
    '🔥 الأماكن دي عليها طلب كبير:',
    '👌 جربت الأماكن دي؟ ناس كتير بتحبها:',
  ],
}

export const CONFIRMATION = {
  ask: [
    '📋 تأكيد الطلب:\n\n',
    '📝 كده الأوردر:\n\n',
    '✅ قبل ما نأكد:\n\n',
  ],
  buttons: {
    confirm: '✅ أيوه، أضف للسلة',
    change: '🔄 غير الكمية',
    cancel: '❌ لا، شكراً',
  },
}

export const THINKING_PHRASES = [
  'استنى ثانية بدور... 🔍',
  'بشوفلك... ⏳',
  'ثانية واحدة... 🔎',
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a random item from an array
 */
export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Get a random greeting
 */
export function getGreeting(): string {
  return randomChoice(GREETINGS)
}

/**
 * Get a random provider selected message
 */
export function getProviderSelectedMessage(name: string, rating?: number): string {
  const fn = randomChoice(PROVIDER_SELECTED)
  return fn(name, rating)
}

/**
 * Get a random item found message
 */
export function getItemFoundMessage(item: string, provider: string): string {
  const fn = randomChoice(ITEM_FOUND)
  return fn(item, provider)
}

/**
 * Get a random item not found message
 */
export function getItemNotFoundMessage(item: string, provider?: string): string {
  const fn = randomChoice(ITEM_NOT_FOUND)
  return fn(item, provider)
}

/**
 * Get a random quantity ask message
 */
export function getQuantityAskMessage(item: string, price: number): string {
  const fn = randomChoice(QUANTITY_ASK)
  return fn(item, price)
}

/**
 * Get a random variant ask message
 */
export function getVariantAskMessage(item: string): string {
  const fn = randomChoice(VARIANT_ASK)
  return fn(item)
}

/**
 * Get a random added to cart message
 */
export function getAddedToCartMessage(qty: number, item: string, price: number, provider: string): string {
  const fn = randomChoice(ADDED_TO_CART)
  return fn(qty, item, price, provider)
}

/**
 * Get a random cart empty message
 */
export function getCartEmptyMessage(): string {
  return randomChoice(CART_EMPTY)
}

/**
 * Get a random cart cleared message
 */
export function getCartClearedMessage(): string {
  return randomChoice(CART_CLEARED)
}

/**
 * Get a random cancel response based on context
 */
export function getCancelResponse(context: 'variant' | 'item' | 'provider' | 'nothing'): string {
  return randomChoice(CANCEL_RESPONSES[context])
}

/**
 * Get a random recommendation header
 */
export function getRecommendationHeader(provider?: string): string {
  if (provider) {
    return randomChoice(RECOMMENDATIONS.withProvider(provider))
  }
  return randomChoice(RECOMMENDATIONS.general)
}

/**
 * Get a random confirmation header
 */
export function getConfirmationHeader(): string {
  return randomChoice(CONFIRMATION.ask)
}

// =============================================================================
// TIME-BASED GREETINGS (Phase 5 preparation)
// =============================================================================

export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return randomChoice([
      'صباح الخير! ☀️ عايز تفطر إيه النهارده؟',
      'صباح النور! 🌅 جاهز أساعدك تطلب فطارك',
      'أهلاً! صباحك سعيد 😊 نفسك في إيه الصبح ده؟',
    ])
  } else if (hour >= 12 && hour < 17) {
    return randomChoice([
      'أهلاً! 👋 وقت الغدا، عايز تاكل إيه؟',
      'يا هلا! 🍽️ جعان؟ قولي عايز إيه للغدا',
      'أهلاً بيك! نفسك في إيه للغدا النهارده؟',
    ])
  } else if (hour >= 17 && hour < 21) {
    return randomChoice([
      'مساء الخير! 🌆 عايز تطلب عشاك؟',
      'أهلاً! وقت العشا، نفسك في إيه؟ 🍕',
      'مساء النور! جاهز أساعدك تطلب عشاك 😊',
    ])
  } else {
    return randomChoice([
      'أهلاً! 🌙 سهران ونفسك تاكل حاجة؟',
      'يا هلا! لسه صاحي؟ عايز تطلب حاجة خفيفة؟ 🌙',
      'أهلاً بيك! نفسك في حاجة تاكلها دلوقتي؟',
    ])
  }
}

// =============================================================================
// UPSELL SUGGESTIONS BY CATEGORY (Phase 2 preparation)
// =============================================================================

export const UPSELL_BY_CATEGORY: Record<string, string[]> = {
  pizza: ['بيبسي', 'بطاطس', 'سلطة'],
  burger: ['بطاطس', 'كولا', 'آيس كريم'],
  chicken: ['أرز', 'سلطة', 'مشروب'],
  pasta: ['سلطة', 'خبز', 'مشروب'],
  breakfast: ['عصير', 'شاي', 'قهوة'],
  coffee: ['كرواسون', 'كيك', 'بسكويت'],
  default: ['مشروب', 'حلويات'],
}

/**
 * Get upsell suggestions based on item category
 */
export function getUpsellSuggestions(category?: string): string[] {
  return UPSELL_BY_CATEGORY[category || 'default'] || UPSELL_BY_CATEGORY.default
}
