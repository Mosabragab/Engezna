# Claude Project Guide - Engezna (إنجزنا)

**Status:** Production Ready | **Launch:** February 21, 2026
**Docs:** [PRD.md](PRD.md) | [CHANGELOG.md](CHANGELOG.md) | [API.md](API.md)

---

## Rules

### Code Quality

- **Always run Prettier before committing** to avoid CI failures: `npx prettier --write .`
- **Never mark a task complete without verifying** it works — run tests, check logs, demonstrate correctness
- **Simplicity first** — make every change as simple as possible, impact minimal code
- **No temporary fixes** — find root causes, maintain senior developer standards
- **Minimal impact** — changes should only touch what's necessary, avoid introducing bugs
- **Autonomous bug fixing** — when given a bug report, just fix it; point at logs, errors, failing tests, then resolve them

### SQL Migrations

- **Never use `CREATE POLICY IF NOT EXISTS`** — PostgreSQL doesn't support it. Use `DO $$ ... END $$` blocks with `pg_policies` checks
- **Always verify migrations against actual DB schema** before writing (check `information_schema.tables` and `information_schema.columns`)
- **Use idempotent patterns**: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- **order_status enum**: Only contains `'delivered'` — don't use `'completed'` or `'customer_confirmed'`

### Supabase

- **Never use `!foreign_key` syntax for nullable relations** — creates INNER JOIN, excludes NULLs. Use separate queries instead
- **RLS restrictions**: Use server-side queries in `page.tsx` for cross-user data
- **Use service role key** only in API routes, never in client components

### Financial System

- **Database is the ONLY source for financial calculations** — frontend displays values, never calculates
- **`financial_settlement_engine` view is the single source of truth**
- **Use Money class** (`src/lib/finance/money.ts`) — uses piasters internally for precision
- **Commission**: max 7%, delivery fees never touched by commission/refunds
- **Grace period**: 0% commission for new providers (tracks theoretical commission for visibility)
- Settlements: Only include orders where BOTH `status='delivered'` AND `payment_status='completed'`

---

## Quick Reference

### Project Links

- **Live:** https://engezna.vercel.app | https://www.engezna.com
- **GitHub:** https://github.com/Mosabragab/Engezna
- **Supabase:** https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr

### Tech Stack

- Next.js 16 (Turbopack) + TypeScript 5.9 + React 19.2
- Tailwind CSS v3.4 + Shadcn/ui
- Supabase (PostgreSQL 15) + Supabase Realtime
- next-intl (bilingual AR/EN) + Zustand (state) + Zod (validation)

---

## Brand Colors

**Official brand color: ENGEZNA BLUE #009DE0** (NOT orange or green)

```css
--primary: #009de0; /* Engezna Blue */
--secondary: #000000; /* Black */
--background: #ffffff; /* White */
--deal: #00c27a; /* Green-Cyan (Deals/Success) */
--premium: #ffd166; /* Soft Gold (Premium/Warning) */
--info: #36c5f0; /* Sky Blue (Info) */
--error: #ff5a5f; /* Coral Red (Error) */
```

**Light-Only Theme** — dark mode removed for consistent brand experience.

---

## Architecture

### Business Model

- B2C delivery marketplace — Egypt, starting from Upper Egypt
- 3 months 0% commission, then max 7% (vs competitors' 25-30%)
- 6 business categories: Restaurant, Cafe, Supermarket, Juice, Pharmacy, Vegetables

### Key Patterns

- **COD vs Online settlements**: COD → provider owes commission; Online → Engezna owes payout
- **Custom orders** (`custom_order_requests`) → Creates `orders` entry on approval; settlements only query `orders`
- **Bilingual**: All user-facing text has `_ar` / `_en` variants
- **RTL**: Dynamic arrow icons based on locale, CSS logical properties

### Database Enums

```
provider_status: pending_approval | incomplete | approved | rejected | suspended | open | closed | temporarily_paused | on_vacation
order_status: pending | accepted | preparing | ready | out_for_delivery | delivered | cancelled | rejected
banner_approval_status: pending | approved | rejected | cancelled
banner_type: customer | partner
settlement_status: pending | processing | completed | failed | overdue | cancelled
```

### AI Assistant (Ahmad) — DISABLED

- Status: Disabled (`NEXT_PUBLIC_AI_ASSISTANT_ENABLED=true` to enable)
- Architecture: GPT-4o-mini + Function Calling (22 tools)
- Docs: [docs/features/AI_SMART_ASSISTANT.md](docs/features/AI_SMART_ASSISTANT.md)

---

## Key Files

### Core

| File                        | Purpose                      |
| --------------------------- | ---------------------------- |
| `src/app/globals.css`       | Brand colors & CSS variables |
| `src/i18n/messages/ar.json` | Arabic translations          |
| `src/i18n/messages/en.json` | English translations         |
| `src/lib/store/cart.ts`     | Zustand cart state           |

### Financial System

| File                                                                 | Purpose                           |
| -------------------------------------------------------------------- | --------------------------------- |
| `supabase/migrations/20251225100000_financial_settlement_engine.sql` | Settlement engine SQL view (SSoT) |
| `src/lib/finance/money.ts`                                           | Money class (piasters precision)  |
| `src/lib/finance/financial-service.ts`                               | Financial service layer           |
| `src/lib/commission/utils.ts`                                        | Commission calculation utils      |
| `src/types/finance.ts`                                               | Finance TypeScript types          |
| `src/app/api/cron/settlements/route.ts`                              | Daily settlement cron job         |

### Admin

| File                                          | Purpose                |
| --------------------------------------------- | ---------------------- |
| `src/components/admin/AdminSidebar.tsx`       | Admin navigation       |
| `src/app/[locale]/admin/settlements/page.tsx` | Settlements management |
| `src/app/[locale]/admin/banners/page.tsx`     | Banners management     |
| `src/app/[locale]/admin/promotions/page.tsx`  | Promo codes management |
| `src/lib/admin/types.ts`                      | Admin module types     |

### Provider

| File                                             | Purpose                   |
| ------------------------------------------------ | ------------------------- |
| `src/app/[locale]/provider/orders/page.tsx`      | Provider order management |
| `src/app/[locale]/provider/settlements/page.tsx` | Provider settlements view |
| `src/app/[locale]/provider/banner/page.tsx`      | Provider banner creation  |

### Customer

| File                                                | Purpose                         |
| --------------------------------------------------- | ------------------------------- |
| `src/app/[locale]/checkout/page.tsx`                | Checkout with promo codes       |
| `src/components/customer/home/OffersCarousel.tsx`   | Banner carousel with analytics  |
| `src/components/customer/layout/CustomerHeader.tsx` | Customer header & notifications |

### Settings & Config

| File                                 | Purpose                          |
| ------------------------------------ | -------------------------------- |
| `src/lib/settings/schemas.ts`        | Settings validation schemas      |
| `src/lib/settings/defaults.ts`       | Settings default values          |
| `src/components/admin/GeoFilter.tsx` | Reusable geo-targeting component |

---

## Lessons Learned

| Problem                                    | Root Cause                                                       | Solution                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `CREATE POLICY IF NOT EXISTS` fails        | PostgreSQL doesn't support it                                    | Use `DO $$ ... END $$` with `pg_policies` check                              |
| Supabase JOIN excludes NULL relations      | `!foreign_key` creates INNER JOIN                                | Use separate queries + manual mapping                                        |
| Admin analytics show zeros for governorate | Old orders lack geographic IDs                                   | Hybrid filtering: match by ID first, fallback to name                        |
| Products disappear on JOIN                 | Nullable category_id excluded                                    | Separate queries instead of JOIN                                             |
| Dropdown closes on hover                   | CSS gap between trigger and menu                                 | Use `mt-0` and `top-full`                                                    |
| RTL arrows wrong direction                 | Hardcoded arrow icons                                            | Check `isRTL` and swap icons                                                 |
| Ghost buttons invisible                    | No hover background defined                                      | Add `hover:bg-muted`                                                         |
| Partial refunds zero entire commission     | No proportional reduction                                        | `commission_reduction = original_commission * (refund_amount / order_total)` |
| Grace period config conflict               | `COMMISSION_CONFIG.GRACE_PERIOD_DAYS = 90` vs `defaults.ts: 180` | Needs resolution — verify which is authoritative                             |

---

## Rate Limiting

```typescript
LOGIN_LIMIT:          { maxAttempts: 10, window: 15min, block: 30min }
OTP_SEND_LIMIT:       { maxAttempts: 5,  window: 10min, block: 30min }
OTP_VERIFY_LIMIT:     { maxAttempts: 5,  window: 5min,  block: 15min }
PASSWORD_RESET_LIMIT: { maxAttempts: 3,  window: 60min, block: 60min }
```

---

## Missing Features

- Email notifications (needs Resend/SendGrid)
- SMS notifications (no Twilio integration)
- Scheduled orders
- Google Maps integration
- Multi-user support for providers
- Inventory/stock management
