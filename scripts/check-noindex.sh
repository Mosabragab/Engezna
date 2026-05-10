#!/usr/bin/env bash
# Guardrail for accidental SEO regressions.
#
# Lighthouse's `is-crawlable` audit is skipped when measuring Vercel
# preview deployments (see lighthouserc.js) because Vercel sets a
# `x-robots-tag: noindex` header on previews — that's platform
# behavior, not our code. The skip removes deterministic measurement
# noise, but it also means a stray `noindex` in our source would not
# fail the SEO assertion on preview runs.
#
# This script closes that gap: it greps for `noindex` in src/ and
# fails if any file outside the allowlist contains it. Auth pages
# (`/auth/*`) are intentionally noindex.
#
# Tracked in docs/PERFORMANCE_OPTIMIZATION_ROADMAP.md §8 as a Phase 2
# follow-up; will be retired once a production Lighthouse workflow
# reinstates the `is-crawlable` audit against www.engezna.com.

set -euo pipefail

ALLOWLIST=(
  "src/app/[locale]/auth/layout.tsx"
)

mapfile -t HITS < <(grep -rln 'noindex' src/ \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  || true)

UNEXPECTED=()
for hit in "${HITS[@]}"; do
  allowed=false
  for allowed_path in "${ALLOWLIST[@]}"; do
    if [[ "$hit" == "$allowed_path" ]]; then
      allowed=true
      break
    fi
  done
  if [[ "$allowed" == false ]]; then
    UNEXPECTED+=("$hit")
  fi
done

if [[ ${#UNEXPECTED[@]} -gt 0 ]]; then
  echo "ERROR: 'noindex' found outside the allowlist:" >&2
  for f in "${UNEXPECTED[@]}"; do
    echo "  - $f" >&2
    grep -n 'noindex' "$f" >&2 || true
  done
  echo "" >&2
  echo "If this is intentional, add the file to ALLOWLIST in scripts/check-noindex.sh." >&2
  echo "Otherwise remove the noindex directive — Lighthouse 'is-crawlable' is skipped" >&2
  echo "on Vercel preview runs, so this guardrail is the only check on PR CI." >&2
  exit 1
fi

echo "noindex guardrail: OK (${#HITS[@]} expected occurrence(s) inside allowlist)"
