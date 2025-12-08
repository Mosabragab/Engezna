# Engezna Project Status

## Last Updated: 2025-12-08

## Project Overview
Engezna is a multi-vendor e-commerce platform connecting customers with local providers (restaurants, supermarkets, cafes, etc.) in Egypt.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State Management**: Zustand (cart)
- **UI Components**: shadcn/ui
- **Localization**: next-intl (Arabic/English)

---

## Current Status: Development Phase

### Completed Features

#### Customer Side
- [x] Customer registration & authentication
- [x] Provider browsing and search
- [x] Provider details page with products
- [x] Shopping cart functionality
- [x] Checkout flow with address management
- [x] Order placement and confirmation page
- [x] Order tracking and history
- [x] Order cancellation (pending orders only)
- [x] Favorites system
- [x] Customer header with cart icon
- [x] Real-time notifications (with polling fallback)
- [x] In-app chat with provider
- [x] Message read status indicators (✓/✓✓)

#### Provider Side
- [x] Provider registration & approval flow
- [x] Provider dashboard with statistics
- [x] Order management (accept/reject/status updates)
- [x] Product management (CRUD)
- [x] Business hours management
- [x] Provider settings
- [x] Finance page with COD/Online breakdown
- [x] Reports with payment method analytics
- [x] Real-time notifications system
- [x] In-app chat with customers
- [x] Notification management (mark read, delete)

#### Admin Side
- [x] Admin dashboard
- [x] Provider approval system
- [x] Basic analytics
- [x] Settlements management (COD/Online breakdown)
- [x] Settlement payment recording
- [x] Customer management (ban/unban with notifications)
- [x] Order management
- [x] Customer ban system (cancels orders, notifies providers)
- [x] Customer unban notification

---

## Test Accounts

| Email | Password | Role | Provider |
|-------|----------|------|----------|
| provider@test.com | Test123! | provider_owner | سوبر ماركت النجاح |
| provider2@test.com | Test123! | provider_owner | سلطان بيتزا |
| provider3@test.com | Test123! | provider_owner | لافندر كافيه |
| provider4@test.com | Test123! | provider_owner | مطعم الصفا |
| customer@test.com | Test123! | customer | - |
| admin@test.com | Test123! | admin | - |

---

## Database Schema Highlights
- `profiles` - User profiles with roles (customer, provider_owner, provider_staff, admin)
- `providers` - Store/provider information
- `products` - Product catalog
- `orders` - Order records with payment_method (cash/online)
- `order_items` - Order line items
- `addresses` - Customer delivery addresses
- `favorites` - Customer favorites
- `settlements` - Provider settlements with COD/Online breakdown
- `settlement_items` - Individual orders in settlements
- `admin_users` - Admin user records
- `customer_notifications` - Customer notification system
- `provider_notifications` - Provider notification system
- `order_messages` - Chat messages between customer and provider

---

## RLS Policies Summary
- Customers can view all approved providers
- Customers can create orders only if is_active = true (not banned)
- Customers can cancel their own pending orders (if not banned)
- Providers can manage their own orders and products
- Admins can update/delete all orders
- Banned customers cannot create new orders (RLS enforced)

---

## Known Issues
- None currently

---

## Deployment
- **Platform**: Vercel
- **Preview URL**: engezna-rjt1rdc1e-engeznas-projects.vercel.app
