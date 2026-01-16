# Contributing to Engezna - المساهمة في إنجزنا

<div dir="rtl">

> **ملاحظة:** هذا المشروع حالياً خاص ومغلق للمساهمات الخارجية. هذا الدليل للفريق الداخلي والمساهمين المستقبليين المعتمدين.

</div>

> **Note:** This project is currently private and closed for external contributions. This guide is for internal team members and future authorized contributors.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Code Style Guide](#code-style-guide)
- [Commit Guidelines](#commit-guidelines)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)
- [Database Migrations](#database-migrations)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Development Setup

### Prerequisites

- Node.js 18.x or later
- npm (comes with Node.js)
- Git
- Supabase account (for database)
- VSCode (recommended)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/Mosabragab/Engezna.git
cd Engezna

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### VSCode Extensions (Recommended)

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript
- Arabic Language Support

---

## Code Style Guide

### TypeScript

- Use TypeScript strict mode (`strict: true`)
- Define types in `/src/types/` directory
- Avoid `any` type - use `unknown` or proper typing
- Use interfaces for object shapes, types for unions/primitives

```typescript
// Good
interface User {
  id: string
  name: string
  email: string
}

// Avoid
const user: any = { ... }
```

### React Components

- Use functional components with hooks
- Use `'use client'` directive only when needed
- Keep components small and focused
- Extract logic to custom hooks

```typescript
// Component structure
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  onAction: () => void
}

export function MyComponent({ title, onAction }: Props) {
  // State
  const [loading, setLoading] = useState(false)

  // Effects
  useEffect(() => {
    // ...
  }, [])

  // Handlers
  const handleClick = () => {
    // ...
  }

  // Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>{loading ? 'Loading...' : 'Click'}</Button>
    </div>
  )
}
```

### Styling (Tailwind CSS)

- Use Tailwind utility classes
- Follow mobile-first approach
- Use design system tokens from `tailwind.config.ts`
- Support RTL with `rtl:` prefix when needed

```tsx
// Good - responsive and RTL-aware
<div className="p-4 md:p-6 rtl:text-right">
  <h1 className="text-lg md:text-xl font-semibold">Title</h1>
</div>
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `UserCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Utils: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `camelCase.ts` (e.g., `database.ts`)

### Folder Structure

```
src/
├── app/[locale]/          # Pages (Next.js App Router)
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── shared/            # Shared components
│   ├── customer/          # Customer-specific components
│   ├── provider/          # Provider-specific components
│   └── admin/             # Admin-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and clients
├── types/                 # TypeScript types
└── i18n/                  # Internationalization
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation only                       |
| `style`    | Code style (formatting, no logic change) |
| `refactor` | Code refactoring                         |
| `perf`     | Performance improvement                  |
| `test`     | Adding/updating tests                    |
| `chore`    | Build process, dependencies              |

### Scopes

- `customer` - Customer-facing features
- `provider` - Provider dashboard features
- `admin` - Admin panel features
- `auth` - Authentication
- `db` - Database/migrations
- `api` - API routes
- `ui` - UI components

### Examples

```bash
# Feature
feat(customer): add order tracking page

# Bug fix
fix(provider): resolve order status update race condition

# Documentation
docs: update API documentation

# Refactor
refactor(admin): simplify permissions hook
```

---

## Branch Naming

### Format

```
<type>/<short-description>
```

### Examples

```
feat/order-tracking
fix/login-validation
refactor/admin-sidebar
docs/api-endpoints
```

---

## Pull Request Process

1. **Create feature branch** from `main`
2. **Make changes** following code style guide
3. **Test locally** - ensure `npm run build` passes
4. **Commit** using conventional commits
5. **Push** and create Pull Request
6. **Fill PR template** with description and testing notes
7. **Request review** from team member
8. **Address feedback** if any
9. **Merge** after approval

### PR Checklist

- [ ] Code follows style guide
- [ ] TypeScript compiles without errors
- [ ] Translations added for new text (AR/EN)
- [ ] Database migrations included if needed
- [ ] Tested on mobile and desktop
- [ ] RTL layout verified

---

## Database Migrations

### Creating Migrations

Migrations are in `/supabase/migrations/` with naming format:

```
YYYYMMDDHHMMSS_description.sql
```

### Example

```sql
-- 20260111100000_add_custom_orders.sql

-- Add new table
CREATE TABLE custom_order_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE custom_order_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON custom_order_requests FOR SELECT
  USING (auth.uid() = customer_id);
```

### Important Notes

- Always add RLS policies for new tables
- Use `SECURITY DEFINER` for admin operations
- Test migrations locally before pushing
- Never modify existing migrations after merge

---

## Testing

### Manual Testing Checklist

1. **Customer Flow**
   - Browse providers
   - Add to cart
   - Checkout
   - Track order

2. **Provider Flow**
   - Login
   - Manage orders
   - Update menu
   - View analytics

3. **Admin Flow**
   - Login
   - Manage users
   - View reports

### E2E Tests (Playwright)

```bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test e2e/customer-journey.spec.ts
```

---

## Documentation

### When to Update Docs

- New feature added → Update PRD.md
- API endpoint added/changed → Update API.md
- Session completed → Update CHANGELOG.md
- Architecture change → Update claude.md

### Translation Keys

All user-facing text must have translations in:

- `/src/i18n/messages/ar.json`
- `/src/i18n/messages/en.json`

```json
// ar.json
{
  "orders": {
    "status": {
      "pending": "قيد الانتظار",
      "delivered": "تم التوصيل"
    }
  }
}

// en.json
{
  "orders": {
    "status": {
      "pending": "Pending",
      "delivered": "Delivered"
    }
  }
}
```

---

## Contact

For questions or issues:

- **Email:** support@engezna.com
- **GitHub Issues:** [Create Issue](https://github.com/Mosabragab/Engezna/issues)

---

<div align="center">

**شكراً لمساهمتك! - Thank you for contributing!**

</div>
