# Archived E2E Tests

> **Note:** These files are archived and NOT run in CI.

## Why Archived?

These tests were replaced by the consolidated test files:

- `comprehensive-e2e.spec.ts` (74 tests)
- `business-flow.spec.ts` (40 tests)

The consolidated files provide better organization, consistent patterns, and comprehensive coverage.

## Archived Files

| File                                | Original Purpose     | Replaced By               |
| ----------------------------------- | -------------------- | ------------------------- |
| `admin-integrations.spec.ts`        | Admin API tests      | comprehensive-e2e.spec.ts |
| `admin-panel.spec.ts`               | Admin UI tests       | comprehensive-e2e.spec.ts |
| `auth.spec.ts`                      | Authentication tests | comprehensive-e2e.spec.ts |
| `customer-complete-journey.spec.ts` | Customer flow        | comprehensive-e2e.spec.ts |
| `customer-journey.spec.ts`          | Customer pages       | comprehensive-e2e.spec.ts |
| `infrastructure.spec.ts`            | Basic health checks  | comprehensive-e2e.spec.ts |
| `merchant-complete-journey.spec.ts` | Merchant flow        | business-flow.spec.ts     |
| `merchant-operations.spec.ts`       | Merchant pages       | comprehensive-e2e.spec.ts |
| `security-limits.spec.ts`           | Security tests       | comprehensive-e2e.spec.ts |
| `E2E_TEST_REPORT.md`                | Old test report      | docs/E2E_TEST_PLAN.md     |
| `PERFORMANCE_AUDIT_GUIDE.md`        | Performance guide    | Archived                  |

## Can I Delete These?

**No, keep them for reference.** They may contain useful patterns or edge cases that could be added to the main test files later.

## How to Restore a Test

If you need to restore a test pattern:

1. Read the archived file
2. Copy the relevant test to `comprehensive-e2e.spec.ts` or `business-flow.spec.ts`
3. Update to follow the current test standards (see main README.md)
4. Verify the test passes locally before pushing
