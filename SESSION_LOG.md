# Session Log

## Session: 2025-12-10 - Excel Import System & Product Variants

### Summary
Comprehensive implementation of product import from Excel with 4 pricing types, variant system, and customer UI improvements.

### Completed Tasks

#### 1. Pricing Types System
- **4 Pricing Types**:
  - `fixed` - Fixed price product
  - `per_unit` - Price per unit (like per kg)
  - `variants` - Multiple variants (sizes/options)
  - `weight_variants` - Weight-based variants (quarter/half/full kilo)
- **Database**: Added `pricing_type` column to `menu_items` table
- **Types**: Updated TypeScript types across components

#### 2. Product Variants System
- **Database Table**: `product_variants` with columns:
  - `variant_type`: size, weight, option
  - `name_ar`, `name_en`, `price`, `original_price`
  - `is_default`, `display_order`, `is_available`
- **UI Components**:
  - `VariantSelectionModal` - For selecting variants
  - `ProductDetailModal` - Full product view with variants

#### 3. Provider Categories System
- **Database Table**: `provider_categories` with:
  - `provider_id`, `name_ar`, `name_en`
  - `display_order`, `is_active`, `description_ar/en`
- **Fix**: Changed from wrong table names (`product_categories`, `menu_categories`) to `provider_categories`
- **Import**: Categories imported from Excel automatically

#### 4. Excel Menu Import Feature
- **Import Page**: `/provider/menu-import`
- **Excel Columns**: name_ar, name_en, description_ar, description_en, price, original_price, category, is_available, preparation_time, is_spicy, is_vegetarian, pricing_type, variants
- **Variants Format**: `نصف كيلو:480|ربع كيلو:250`
- **Results**: Successfully imported 30 categories, 156 products, 203 variants

#### 5. Customer UI Fixes
- **Modal z-index**: Increased from z-50 to z-[60] to appear above bottom navigation
- **Add to Cart button**: Fixed visibility on mobile (was hidden behind navigation)
- **Click-to-close**: Added onClick on backdrop to close modals
- **Product Detail Modal**: Now opens when clicking on products

#### 6. Provider Products Page Fix - CRITICAL
- **Issue**: All products disappeared after adding category JOIN
- **Root Cause**: Supabase `!category_id` syntax creates INNER JOIN
- **Fix**: Changed to two separate queries and manual mapping (simulates LEFT JOIN)
- **Lesson**: Avoid Supabase foreign key join syntax for nullable relations

### Files Created
- `supabase/migrations/20251210000001_product_variants.sql`
- `supabase/migrations/20251210000002_provider_categories.sql`
- `src/app/[locale]/provider/menu-import/page.tsx`
- `src/app/api/menu-import/save/route.ts`
- `src/components/customer/shared/VariantSelectionModal.tsx`
- `src/components/customer/shared/ProductDetailModal.tsx`

### Files Modified
- `src/app/[locale]/provider/products/page.tsx` - Category display, separate queries fix
- `src/app/[locale]/provider/products/[id]/page.tsx` - Light mode, correct table name
- `src/app/[locale]/providers/[id]/page.tsx` - Variants loading, ProductDetailModal
- `src/components/customer/shared/index.ts` - Export new components

### Database Changes
- New table: `product_variants`
- New table: `provider_categories`
- New column: `menu_items.pricing_type` enum
- New column: `menu_items.has_variants` boolean

### Key Lessons Learned

#### 1. Supabase JOIN Syntax
**AVOID using `!foreign_key` for nullable foreign keys!**
```typescript
// BAD - Creates INNER JOIN, excludes NULL category_id
.select(`*, category:provider_categories!category_id (...)`)

// GOOD - Separate queries, manual mapping (LEFT JOIN behavior)
const products = await supabase.from('menu_items').select('*')
const categories = await supabase.from('provider_categories').select('*')
const mapped = products.map(p => ({
  ...p,
  category: categoryMap.get(p.category_id) || null
}))
```

#### 2. Modal z-index
Bottom navigation uses z-50, modals must use z-[60] or higher to appear on top.

---

## Session: 2025-12-08 (Continued) - Settlement Groups & UI Fixes

### Summary
Implemented settlement groups system for auto-settlements, fixed provider queries, and improved UI consistency.

### Completed Tasks

#### 1. Settlement Groups System
- **Feature**: Created settlement groups for automated settlements
- **Groups**: Daily, 3-Day (default), Weekly (Saturday)
- **Database**:
  - Created `settlement_groups` table with frequency options
  - Added `settlement_group_id` column to `providers` table
  - Created trigger for assigning default group to new providers
  - Created `generate_auto_settlements()` function for automation
- **UI**: Full CRUD admin page at `/admin/settlements/groups`
- **Migration**: `20251209000001_settlement_groups.sql`

#### 2. Reorder Functionality Fix
- **Issue**: "اطلب تاني" button redirected to empty cart
- **Fix**: Implemented full reorder logic:
  - Fetch order items from database
  - Fetch current menu items from provider
  - Add available items to cart
  - Navigate to checkout
- **File**: `src/app/[locale]/page.tsx`

#### 3. Provider Queries Fix - CRITICAL LESSON
- **Issue**: Providers not showing in dropdowns ("لا يوجد مزودين نشطين")
- **Root Cause 1**: Code used `is_approved` column which DOESN'T EXIST
- **Root Cause 2**: Providers table uses `status` enum, not boolean approval
- **Valid Status Values**: `open`, `closed`, `temporarily_paused`, `on_vacation`, `incomplete`
- **Fix**: Removed `is_approved` filter, query all providers
- **Lesson**: ALWAYS verify column names exist before using them!

#### 4. Settlements Page UI Improvements
- **Colors**: Updated stats cards to use platform identity colors
  - Paid: Emerald green
  - Overdue: Red (platform accent)
  - Pending: Amber
- **Navigation**: Added "مجموعات التسوية" button linking to groups page
- **File**: `src/app/[locale]/admin/settlements/page.tsx`

#### 5. Analytics Page Colors
- **Issue**: Revenue bars used red color, not matching platform
- **Fix**: Changed to `from-primary to-primary/80` gradient
- **File**: `src/app/[locale]/admin/analytics/page.tsx`

#### 6. Admin Sidebar State Persistence
- **Issue**: Sidebar disappeared when navigating between admin pages
- **Root Cause**: Each page had its own `useState(false)` for sidebar
- **Fix**: Created `AdminSidebarContext` for shared state across pages
- **Files**:
  - Created `src/components/admin/AdminSidebarContext.tsx`
  - Updated `src/app/[locale]/admin/layout.tsx`
  - Updated settlements and groups pages to use context

### Files Created
- `supabase/migrations/20251209000001_settlement_groups.sql`
- `src/app/[locale]/admin/settlements/groups/page.tsx`
- `src/components/admin/AdminSidebarContext.tsx`

### Files Modified
- `src/app/[locale]/page.tsx` - Reorder functionality
- `src/app/[locale]/admin/settlements/page.tsx` - UI improvements, provider fix
- `src/app/[locale]/admin/analytics/page.tsx` - Color updates
- `src/app/[locale]/admin/layout.tsx` - Sidebar context provider
- `src/components/admin/index.ts` - Export sidebar context

### Database Changes
- New table: `settlement_groups`
- New column: `providers.settlement_group_id`
- New function: `generate_auto_settlements()`
- New trigger: `set_default_settlement_group`

### Key Lessons Learned

#### 1. Column Name Verification
**ALWAYS query the database schema before using column names!**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'providers';
```
We wasted time debugging because `is_approved` column doesn't exist.

#### 2. RLS Policy Debugging
When queries return empty but data exists:
1. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
2. Check column names exist
3. Check filter values match actual data
4. Add error logging to catch silent failures

#### 3. Status Field Values
The `providers.status` enum has these values:
- `open` - Store is open
- `closed` - Store is closed
- `temporarily_paused` - Temporarily unavailable
- `on_vacation` - On vacation
- `incomplete` - Registration incomplete

There is NO `is_approved` boolean column. Approval is handled by status values.

---

## Session: 2025-12-08 (Evening) - Customer Ban System & Order Workflow

### Summary
Comprehensive implementation of customer ban functionality with proper order cancellation, notifications, and RLS policies.

### Completed Tasks

#### 1. Customer Ban - Order Cancellation Fix
- **Issue**: When admin bans a customer, their active orders were NOT being cancelled
- **Root Cause 1**: No admin UPDATE policy on orders table
- **Root Cause 2**: Used invalid `order_status` enum value 'confirmed' (doesn't exist)
- **Valid Enum Values**: pending, accepted, preparing, ready, out_for_delivery, delivered, cancelled, rejected
- **Fixes**:
  - Added RLS policy: "Admins can update all orders"
  - Updated cancel function to use correct status values
  - Granted service_role full access to orders table
- **Migration**: `20251208000003_fix_order_cancellation_admin.sql`

#### 2. Block Banned Customers from Creating Orders
- **Issue**: Banned customers (is_active = false) could still create new orders
- **Fix**: Updated RLS INSERT policy to check `is_active = true`
- **User Experience**: Shows clear error message explaining account is banned
- **Migration**: `20251208000004_block_banned_customers_orders.sql`
- **File**: `src/app/[locale]/checkout/page.tsx`

#### 3. Improved Ban Messages
- **Change**: Updated all messages from "إدارة إنجزنا" to "خدمة عملاء إنجزنا"
- **Customer Message**: "عذراً، حسابك محظور ولا يمكنك إنشاء طلبات جديدة. يرجى التواصل مع خدمة عملاء إنجزنا للمساعدة."
- **Provider Message**: "تم إلغاء الطلب #XXX بسبب حظر العميل. للاستفسار، تواصل مع خدمة عملاء إنجزنا."
- **Files**: `src/lib/admin/users.ts`, SQL migrations

#### 4. Unban Notification
- **Feature**: When customer is unbanned, they receive notification
- **Message**: "تم تفعيل حسابك - يمكنك الآن استخدام التطبيق بشكل طبيعي. شكراً لتفهمك."
- **File**: `src/lib/admin/users.ts`

#### 5. Provider Sidebar Notification Badge
- **Issue**: Notification badge next to "الطلبات" only showed pending orders
- **Fix**: Badge now shows: pendingOrders + unreadNotifications
- **Files**: `src/components/provider/ProviderSidebar.tsx`, `src/components/provider/ProviderLayout.tsx`

#### 6. Order Details Button for Providers
- **Feature**: Added "تفاصيل" button for providers to view full order details
- **Location**: Pending orders section and active orders section
- **File**: `src/app/[locale]/provider/orders/page.tsx`

### Files Created
- `supabase/migrations/20251208000001_ban_customer_function.sql`
- `supabase/migrations/20251208000002_debug_and_fix_order_cancellation.sql`
- `supabase/migrations/20251208000003_fix_order_cancellation_admin.sql`
- `supabase/migrations/20251208000004_block_banned_customers_orders.sql`

### Files Modified
- `src/lib/admin/users.ts` - Ban/unban functions with notifications
- `src/app/[locale]/checkout/page.tsx` - Detect RLS error for banned customers
- `src/app/[locale]/provider/orders/page.tsx` - Details button
- `src/components/provider/ProviderSidebar.tsx` - Notification badge
- `src/components/provider/ProviderLayout.tsx` - Pass unreadNotifications

### Database Changes
- New RLS policy: "Admins can update all orders" (UPDATE)
- New RLS policy: "Admins can delete orders" (DELETE)
- Updated RLS policy: "Customers can create orders" - now checks is_active
- New function: `cancel_orders_for_banned_customer(UUID, TEXT)` with SECURITY DEFINER
- Granted service_role ALL on orders, provider_notifications, customer_notifications

### Ban System Summary
| Event | Customer Notification | Provider Notification |
|-------|----------------------|----------------------|
| Customer Banned | "تم تعليق حسابك" | "تم إلغاء طلب بسبب حظر العميل" |
| Customer Unbanned | "تم تفعيل حسابك" | - |
| Banned Customer Creates Order | Clear error message | - |

---

## Session: 2025-12-07 (Evening) - Notifications & Chat System

### Summary
Complete overhaul of the notification and messaging system between customers and providers.

### Completed Tasks

#### 1. Provider Notifications System
- **Created**: New `provider_notifications` table matching `customer_notifications` structure
- **Features**:
  - Auto-notifications for new orders, messages, and reviews
  - Mark as read, delete functionality
  - Realtime subscription support
- **Migration**: `20251207000005_provider_notifications.sql`

#### 2. RLS Policies Fix for Notifications Persistence
- **Issue**: Mark as read and delete operations only worked locally, reverted after page refresh
- **Root Cause**: Missing UPDATE and DELETE RLS policies
- **Fixes**:
  - Added DELETE policy for `customer_notifications`
  - Added UPDATE/DELETE policies for `order_messages`
  - Added proper WITH CHECK clauses for `provider_notifications`
- **Migration**: `20251207000006_fix_notification_rls_policies.sql`

#### 3. Realtime Notifications
- **Issue**: Customers didn't receive instant notifications when providers sent messages
- **Root Cause**: `customer_notifications` and `provider_notifications` not added to Supabase realtime publication
- **Fix**: Added both tables to `supabase_realtime` publication
- **Fallback**: Added 10-second polling for customer notifications as reliability backup

#### 4. Chat Message Alignment in RTL
- **Issue**: In Arabic (RTL), own messages appeared on LEFT instead of RIGHT
- **Fix**: Adjusted flexbox justify classes for RTL:
  - Own messages: `justify-start` in RTL (RIGHT side)
  - Other's messages: `justify-end` in RTL (LEFT side)
- **File**: `src/components/shared/OrderChat.tsx`

#### 5. Message Read Status Indicators
- Added checkmarks for sent/read messages:
  - ✓ = Message sent
  - ✓✓ = Message read (blue color)
- Realtime UPDATE subscription for read status changes
- **File**: `src/components/shared/OrderChat.tsx`

#### 6. Store Name in Notifications
- **Issue**: Customer notifications showed "المتجر" instead of actual store name
- **Fix**:
  - Provider order detail page now fetches `name_ar` and `name_en`
  - Passes `providerName` to `OrderChat` component
  - Notifications display actual store name
- **File**: `src/app/[locale]/provider/orders/[id]/page.tsx`

#### 7. Notification Badge Stabilization
- Removed shaking/bounce animation from notification badge
- Badge now shows on all provider pages (via ProviderLayout)
- **Files**: `src/components/provider/ProviderLayout.tsx`, `src/components/provider/ProviderHeader.tsx`

### Files Created
- `supabase/migrations/20251207000005_provider_notifications.sql`
- `supabase/migrations/20251207000006_fix_notification_rls_policies.sql`

### Files Modified
- `src/components/shared/OrderChat.tsx`
- `src/components/provider/ProviderLayout.tsx`
- `src/components/provider/ProviderHeader.tsx`
- `src/hooks/customer/useNotifications.ts`
- `src/app/[locale]/provider/orders/[id]/page.tsx`

### Database Changes
- New table: `provider_notifications`
- New triggers: `notify_provider_new_order`, `notify_provider_new_message`, `notify_provider_new_review`
- RLS policies for `customer_notifications`, `provider_notifications`, `order_messages`
- Realtime publication for notification tables

---

## Previous Sessions
*(See earlier entries for 2025-12-07, 2025-12-08, 2025-12-09)*
