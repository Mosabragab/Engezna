# Engezna API Documentation

> **Last Updated:** January 11, 2026 (Session 26)

This document describes the API endpoints available in Engezna platform.

---

## Table of Contents

- [Authentication](#authentication)
- [Admin APIs](#admin-apis)
- [Payment APIs](#payment-apis)
- [Chat & AI APIs](#chat--ai-apis)
- [Email APIs](#email-apis)
- [Voice Order APIs](#voice-order-apis)
- [Menu Import APIs](#menu-import-apis)
- [Supabase RPC Functions](#supabase-rpc-functions)

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://engezna.com/api
```

---

## Authentication

### Register Customer

```http
POST /api/auth/register
```

Creates a new customer account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "أحمد",
  "lastName": "محمد",
  "phone": "01012345678",
  "governorate_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

### Register Partner (Merchant)

```http
POST /api/auth/partner-register
```

Creates a new merchant account with provider profile.

**Request Body:**
```json
{
  "email": "store@example.com",
  "password": "password123",
  "storeName": "مطعم الخير",
  "ownerName": "محمد أحمد",
  "phone": "01012345678",
  "storeType": "restaurant",
  "governorate_id": "uuid",
  "city_id": "uuid"
}
```

---

### Google OAuth

```http
POST /api/auth/google
```

Exchanges Google authorization code for Supabase session.

**Request Body:**
```json
{
  "code": "authorization_code_from_google"
}
```

---

### Facebook OAuth

```http
GET /api/auth/facebook
```

Initiates Facebook OAuth flow.

```http
GET /api/auth/facebook/callback
```

Handles Facebook OAuth callback.

---

### Delete Account

```http
DELETE /api/auth/delete-account
```

Permanently deletes user account and all associated data.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "confirmationText": "DELETE"
}
```

---

## Admin APIs

> All admin APIs require authentication and appropriate permissions.

### Get Admin Stats

```http
GET /api/admin/stats
```

Returns dashboard statistics.

**Query Parameters:**
- `governorate_id` (optional) - Filter by governorate
- `period` (optional) - `today`, `week`, `month`, `year`

**Response:**
```json
{
  "totalOrders": 1250,
  "totalRevenue": 125000.50,
  "totalUsers": 500,
  "totalProviders": 25,
  "pendingProviders": 3
}
```

---

### Get Orders (Admin)

```http
GET /api/admin/orders
```

Returns orders list with filtering.

**Query Parameters:**
- `status` - Order status filter
- `provider_id` - Filter by provider
- `page` - Page number
- `limit` - Results per page

---

### Get Providers (Admin)

```http
GET /api/admin/providers
```

Returns providers list.

**Query Parameters:**
- `status` - `pending`, `approved`, `rejected`
- `type` - Provider type

---

### Get Users (Admin)

```http
GET /api/admin/users
```

Returns users list.

---

### Get Audit Logs

```http
GET /api/admin/audit
```

Returns admin audit logs.

---

## Payment APIs

### Initiate Kashier Payment

```http
POST /api/payment/kashier/initiate
```

Creates a new payment session with Kashier gateway.

**Request Body:**
```json
{
  "orderId": "uuid",
  "amount": 150.50,
  "customerName": "أحمد محمد",
  "customerEmail": "user@example.com",
  "customerPhone": "01012345678"
}
```

**Response:**
```json
{
  "success": true,
  "paymentUrl": "https://checkout.kashier.io/...",
  "transactionId": "txn_123456"
}
```

---

### Kashier Webhook

```http
POST /api/payment/kashier/webhook
```

Receives payment status updates from Kashier.

**Headers:**
```
X-Kashier-Signature: <webhook_signature>
```

---

## Chat & AI APIs

### AI Chat (مساعد إنجزنا - أحمد)

```http
POST /api/chat
```

Sends message to AI assistant for natural language ordering.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "message": "عايز 2 برجر وبيبسي",
  "providerId": "uuid",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "reply": "تم إضافة 2 برجر كلاسيك (30 ج.م × 2) وبيبسي كبير (15 ج.م) إلى سلة التسوق. المجموع: 75 ج.م. هل تريد شيء آخر؟",
  "actions": [
    { "type": "add_to_cart", "item": "burger", "quantity": 2 },
    { "type": "add_to_cart", "item": "pepsi", "quantity": 1 }
  ]
}
```

---

### Generate Embeddings

```http
POST /api/embeddings
```

Generates text embeddings for semantic search.

**Request Body:**
```json
{
  "text": "برجر لحم بقري مع جبنة شيدر"
}
```

---

## Email APIs

### Send Welcome Email

```http
POST /api/auth/send-welcome-email
```

Sends welcome email to new user.

---

### Send Merchant Welcome

```http
POST /api/emails/merchant-welcome
```

Sends welcome email to new merchant.

---

### Send Store Approved Email

```http
POST /api/emails/store-approved
```

Sends approval notification to merchant.

---

### Send Settlement Email

```http
POST /api/emails/settlement
```

Sends settlement report to merchant.

---

## Voice Order APIs

### Process Voice Order

```http
POST /api/voice-order/process
```

Processes voice recording and extracts order details.

**Request Body:**
```json
{
  "audioUrl": "https://storage.supabase.co/.../voice.mp3",
  "customerId": "uuid"
}
```

**Response:**
```json
{
  "transcription": "عايز 3 كيلو لحمة مفرومة و2 كيلو فراخ",
  "items": [
    { "name": "لحمة مفرومة", "quantity": 3, "unit": "kg" },
    { "name": "فراخ", "quantity": 2, "unit": "kg" }
  ]
}
```

---

### Confirm Voice Order

```http
POST /api/voice-order/confirm
```

Confirms and creates order from voice order data.

---

## Menu Import APIs

### Save Imported Menu

```http
POST /api/menu-import/save
```

Saves bulk imported menu items from Excel.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "providerId": "uuid",
  "items": [
    {
      "name_ar": "برجر كلاسيك",
      "name_en": "Classic Burger",
      "price": 45,
      "category": "برجر",
      "pricing_type": "fixed"
    }
  ]
}
```

---

## Supabase RPC Functions

These are PostgreSQL functions called via Supabase client.

### Customer Functions

#### Approve Custom Order

```typescript
const { data, error } = await supabase.rpc('customer_approve_custom_order', {
  p_request_id: 'uuid'
})
```

Creates order from approved custom order request.

---

#### Reject Custom Order

```typescript
const { data, error } = await supabase.rpc('customer_reject_custom_order', {
  p_request_id: 'uuid'
})
```

---

### Provider Functions

#### Submit Custom Order Pricing

```typescript
const { data, error } = await supabase.rpc('submit_custom_order_pricing', {
  p_request_id: 'uuid',
  p_items: [...],
  p_delivery_fee: 15,
  p_notes: 'ملاحظات التاجر'
})
```

---

### Admin Functions

#### Generate Settlement

```typescript
const { data, error } = await supabase.rpc('generate_provider_settlement', {
  p_provider_id: 'uuid',
  p_period_start: '2026-01-01',
  p_period_end: '2026-01-07',
  p_created_by: 'admin_uuid'
})
```

---

#### Process Refund

```typescript
const { data, error } = await supabase.rpc('process_order_refund', {
  p_order_id: 'uuid',
  p_amount: 50.00,
  p_reason: 'عنصر ناقص'
})
```

---

## Error Responses

All APIs return errors in this format:

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/auth/register` | 10 requests / 15 min |
| `/api/auth/*/otp` | 5 requests / 10 min |
| `/api/chat` | 30 requests / min |
| General | 100 requests / min |

---

## Webhooks

### Menu Item Webhook

```http
POST /api/webhooks/menu-item
```

Triggered when menu items are updated (for cache invalidation).

---

## Notes

1. **Authentication**: Most APIs require Bearer token from Supabase Auth
2. **Rate Limiting**: Implemented using in-memory rate limiter
3. **Validation**: All inputs validated with Zod schemas
4. **Localization**: Error messages support AR/EN based on `Accept-Language` header

---

<div align="center">

**Engezna API v1.0**

</div>
