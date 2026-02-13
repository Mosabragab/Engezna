import crypto from 'crypto';

// Kashier Configuration - validates required credentials at access time
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const kashierConfig = {
  get merchantId() {
    return getRequiredEnv('KASHIER_MERCHANT_ID');
  },
  get apiKey() {
    return getRequiredEnv('KASHIER_API_KEY');
  },
  get secretKey() {
    return getRequiredEnv('KASHIER_SECRET_KEY');
  },
  mode: (process.env.KASHIER_MODE || 'test') as 'test' | 'live',
  baseUrl: 'https://checkout.kashier.io',
  apiUrl: 'https://api.kashier.io',
  currency: 'EGP',
};

/**
 * Generate Kashier order hash for payment authentication
 * Format: /?payment={mid}.{orderId}.{amount}.{currency}
 * Hash: HMAC-SHA256
 */
export function generateKashierOrderHash(
  orderId: string,
  amount: number,
  currency: string = 'EGP'
): string {
  const { merchantId, secretKey } = kashierConfig;

  // Format amount to 2 decimal places
  const formattedAmount = amount.toFixed(2);

  // Build the path string
  const path = `/?payment=${merchantId}.${orderId}.${formattedAmount}.${currency}`;

  // Generate HMAC-SHA256 hash
  const hash = crypto.createHmac('sha256', secretKey).update(path).digest('hex');

  return hash;
}

/**
 * Validate Kashier callback/webhook signature
 * Prevents fake payment notifications
 */
export function validateKashierSignature(
  queryParams: Record<string, string>,
  receivedSignature: string
): boolean {
  const { apiKey } = kashierConfig;

  // Build query string from parameters (excluding signature)
  const params = { ...queryParams };
  delete params.signature;

  // Sort parameters alphabetically and build query string
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');

  // Generate expected signature
  const expectedSignature = crypto.createHmac('sha256', apiKey).update(queryString).digest('hex');

  return expectedSignature === receivedSignature;
}

/**
 * Build Kashier IFrame checkout URL
 */
export function buildKashierCheckoutUrl(params: {
  orderId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  redirectUrl: string;
  webhookUrl?: string;
  language?: 'ar' | 'en';
}): string {
  const { merchantId, apiKey, mode, baseUrl, currency } = kashierConfig;

  const hash = generateKashierOrderHash(params.orderId, params.amount, currency);

  // Build URL with query parameters
  const url = new URL(baseUrl);

  url.searchParams.set('merchantId', merchantId);
  url.searchParams.set('orderId', params.orderId);
  url.searchParams.set('amount', params.amount.toFixed(2));
  url.searchParams.set('currency', currency);
  url.searchParams.set('hash', hash);
  url.searchParams.set('mode', mode);
  url.searchParams.set('merchantRedirect', params.redirectUrl);
  url.searchParams.set('display', params.language || 'ar');
  url.searchParams.set('allowedMethods', 'card,wallet'); // card and mobile wallet

  // Optional parameters
  if (params.customerName) {
    url.searchParams.set('customerName', params.customerName);
  }
  if (params.customerEmail) {
    url.searchParams.set('customerEmail', params.customerEmail);
  }
  if (params.customerPhone) {
    url.searchParams.set('customerPhone', params.customerPhone);
  }
  if (params.description) {
    url.searchParams.set('description', params.description);
  }
  if (params.webhookUrl) {
    url.searchParams.set('serverWebhook', params.webhookUrl);
  }

  return url.toString();
}

/**
 * Kashier IFrame script URL
 */
export const KASHIER_IFRAME_SCRIPT = 'https://checkout.kashier.io/kashier-checkout.js';

/**
 * Payment status mapping
 */
export const KASHIER_PAYMENT_STATUS = {
  SUCCESS: 'SUCCESS',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type KashierPaymentStatus =
  (typeof KASHIER_PAYMENT_STATUS)[keyof typeof KASHIER_PAYMENT_STATUS];

/**
 * Parse Kashier callback response
 */
export interface KashierCallbackResponse {
  paymentStatus: KashierPaymentStatus;
  orderId: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  cardBrand?: string;
  maskedCard?: string;
  signature?: string;
  error?: string;
}

/**
 * Refund a Kashier payment
 * Calls Kashier's refund API to reverse a completed payment
 *
 * @see https://developers.kashier.io/
 */
export async function refundKashierPayment(params: {
  transactionId: string;
  orderId: string;
  amount: number;
  currency?: string;
}): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
}> {
  const { merchantId, apiKey, apiUrl } = kashierConfig;
  const currency = params.currency || kashierConfig.currency;

  // Kashier uses Basic auth: base64(merchantId:apiKey)
  const authToken = Buffer.from(`${merchantId}:${apiKey}`).toString('base64');

  try {
    const response = await fetch(`${apiUrl}/payments/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId: params.transactionId,
        orderId: params.orderId,
        amount: params.amount.toFixed(2),
        currency,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === 'FAILURE') {
      return {
        success: false,
        error: data.message || data.error || `Refund failed (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      refundId: data.refundId || data.transactionId || data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error during refund',
    };
  }
}

export function parseKashierCallback(params: Record<string, string>): KashierCallbackResponse {
  return {
    paymentStatus: (params.paymentStatus || params.status || 'FAILED') as KashierPaymentStatus,
    orderId: params.orderId || params.merchantOrderId || '',
    transactionId: params.transactionId || params.kashierOrderId,
    amount: params.amount ? parseFloat(params.amount) : undefined,
    currency: params.currency,
    cardBrand: params.cardBrand,
    maskedCard: params.maskedCard,
    signature: params.signature,
    error: params.error || params.failureReason,
  };
}
