# Roadmap - Engezna Platform

## MVP Progress: ~96% Complete

---

## High Priority (Before Launch)

### 1. Payment Integration (Kashier) ✅

- [x] Kashier account setup and API credentials
- [x] Integrate Kashier Egyptian payment gateway
- [x] Online payment support for customers
- [x] Payment status webhooks
- [x] Payment result page
- [ ] Account activation (pending Kashier approval)

### 2. App Store Preparation

- [ ] Generate app screenshots (Arabic/English)
- [ ] Write app store descriptions
- [ ] Complete Data Safety Form
- [ ] Privacy Policy URL in manifest (done)
- [ ] Test PWA installation on Android/iOS

### 3. Testing & QA

- [ ] Run existing E2E tests (Playwright)
- [ ] End-to-end user journey testing
- [ ] Payment flow testing
- [ ] Performance testing

---

## Medium Priority

### 4. Admin Promo Code UI

- [ ] Promo code creation form
- [ ] Manage existing promo codes
- [ ] Track usage statistics
- [ ] Expiration and usage limits

### 5. Refund Handling

- [ ] Refund request workflow
- [ ] Admin approval process
- [ ] Balance/payment method refund
- [ ] Refund notifications

### 6. SMS Notifications

- [ ] Twilio or local provider setup
- [ ] Order status SMS notifications
- [ ] OTP verification via SMS

### 7. Push Notifications (Firebase)

- [ ] Firebase Cloud Messaging setup
- [ ] Service worker integration
- [ ] Notification preferences
- [ ] See `/docs/features/FIREBASE_PUSH_NOTIFICATIONS_PLAN.md`

---

## Low Priority (Post-Launch)

### 8. Advanced Analytics

- [ ] Time-series revenue/orders charts
- [ ] Performance metrics and trends
- [ ] Customer retention analytics

### 9. Banner System Enhancements

- [ ] Video banner support
- [ ] A/B testing for banners
- [ ] Analytics (impressions, clicks)

### 10. AI Assistant Improvements

- [ ] Claude 3.5 Haiku migration
- [ ] Improved product context tracking
- [ ] Multi-store support

---

## Non-Technical Tasks (Before Launch)

- [ ] Restaurant onboarding (10 partners minimum)
- [ ] Marketing materials preparation
- [ ] Customer support training
- [ ] Security audit
- [ ] Legal review (Terms & Privacy done)

---

## Completed Features

### Customer Side

- [x] Registration & authentication (Email + Google)
- [x] Provider browsing and search
- [x] Shopping cart and checkout
- [x] Order tracking and history
- [x] Favorites system
- [x] Real-time notifications
- [x] In-app chat with provider
- [x] Product variants (size/weight)
- [x] Guest browsing
- [x] Welcome/Landing page
- [x] PWA support (100/100 score)
- [x] Legal pages (Privacy, Terms)

### Provider Side

- [x] Registration & approval flow
- [x] Dashboard with statistics
- [x] Order management
- [x] Product management (CRUD)
- [x] Excel menu import
- [x] 4 pricing types
- [x] Product variants
- [x] Provider categories
- [x] Finance page (COD/Online)
- [x] Real-time notifications
- [x] In-app chat
- [x] Delete account functionality

### Admin Side

- [x] Dashboard and analytics
- [x] Provider approval system
- [x] Settlements management
- [x] Settlement groups (auto-settlements)
- [x] Customer management (ban/unban)
- [x] Order management
- [x] Sidebar state persistence

---

## Test Accounts

| Email              | Password | Role              |
| ------------------ | -------- | ----------------- |
| provider@test.com  | Test123! | سوبر ماركت النجاح |
| provider2@test.com | Test123! | سلطان بيتزا       |
| customer@test.com  | Test123! | Customer          |
| admin@test.com     | Test123! | Admin             |

---

## Architecture Reference

### Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State**: Zustand (cart)
- **UI**: shadcn/ui
- **i18n**: next-intl (Arabic/English)
- **Testing**: Playwright (E2E)

### Key Files

- `src/app/[locale]/` - Locale-aware pages
- `src/components/` - Reusable components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utilities and API functions
- `supabase/migrations/` - Database migrations

### Pricing Types

| Type              | Description          | Example            |
| ----------------- | -------------------- | ------------------ |
| `fixed`           | Single price         | Coffee - 25 EGP    |
| `per_unit`        | Price per unit       | Meat - 250 EGP/kg  |
| `variants`        | Size/option variants | Pizza S/M/L        |
| `weight_variants` | Weight variants      | Lamb 250g/500g/1kg |
