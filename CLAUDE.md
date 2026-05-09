# Claude Code — Project Build & Style Guide

> دليل مختصر للـ AI agents والـ contributors. **اقرأه قبل أي commit.**

## Pre-commit guarantees

الـ repo يستخدم Husky + lint-staged. قبل كل commit، الـ hook في `.husky/pre-commit` يشغّل `npx lint-staged` الذي بدوره ينفّذ:

| ملفات                  | الأوامر                              |
| ---------------------- | ------------------------------------ |
| `*.{ts,tsx,jsx,js}`    | `eslint --fix` ثم `prettier --write` |
| `*.{json,md,yml,yaml}` | `prettier --write`                   |
| `*.css`                | `prettier --write`                   |

**لكن الـ hook ممكن يتم تجاوزه** في بعض الحالات (مثل بعض sessions الـ AI agent، أو لو شخص استخدم `--no-verify`). الـ CI سيُمسك أي ملف غير مُنسَّق في job `Lint & Type Check` (`.github/workflows/ci.yml`) عبر `npm run format:check`.

## Mandatory checks before any commit

شغّل هذه الأوامر قبل ما تـ commit، خصوصاً لو الـ husky hook ممكن لا يعمل:

```bash
npm run format:check     # prettier --check .  — يفشل لو فيه ملف غير منسَّق
npm run lint             # eslint
npm run typecheck        # tsc --noEmit
```

لو `format:check` فشل، شغّل `npm run format` ليُصلح كل شيء، ثم أعد المحاولة.

## Build & test

```bash
npm ci                   # تثبيت dependencies (في CI نستخدم ci لا install)
npm run build            # next build
npm run start            # next start (production)
npm test                 # vitest run
npm run test:e2e         # playwright (راجع scripts للأنماط الأضيق)
npm run lighthouse       # lhci autorun (lighthouserc.js)
```

## Performance work

كل تعديل أداء يجب أن يقترن بتحديث `docs/PERFORMANCE_OPTIMIZATION_ROADMAP.md` حسب البروتوكول في القسم ٩ من تلك الوثيقة.

## CI workflows

| Workflow                              | متى يعمل                        | ماذا يفحص                                            |
| ------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| `.github/workflows/ci.yml`            | كل push + PR                    | Prettier, ESLint, TypeScript, unit tests, build, e2e |
| `.github/workflows/lighthouse.yml`    | PR إلى `main` + manual dispatch | `lhci autorun` على 6 URLs (حالياً localhost)         |
| `.github/workflows/android-build.yml` | manual dispatch                 | Capacitor Android بناء                               |

## Notes for AI agents

- **لا تعمل commit بدون `npm run format:check`** ناجح. تجاوز الـ husky hook في sandbox شائع، فالـ CI سيكشفه.
- بعد أي تغيير في `docs/*.md`: شغّل `npx prettier --check <file>` على وجه السرعة قبل الـ commit.
- لا ترفع secrets أو ملفات `.env*`.
- اتبع style commits: `type(scope): summary` (مثل: `perf(providers): ...`, `ci(lighthouse): ...`).
