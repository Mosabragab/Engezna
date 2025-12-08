# Session Log

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
