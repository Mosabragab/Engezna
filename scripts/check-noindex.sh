#!/usr/bin/env bash
# Guardrail for accidental SEO regressions.
#
# Lighthouse's `is-crawlable` audit is skipped when measuring Vercel
# preview deployments (see lighthouserc.js) because Vercel sets a
# `x-robots-tag: noindex` header on previews — that's platform
# behavior, not our code. The skip removes deterministic measurement
# noise, but it also means a stray noindex directive in our source
# would not fail the SEO assertion on preview runs.
#
# This script closes that gap. Two patterns matter because Next.js
# metadata accepts both forms:
#   1. String form: `robots: 'noindex, nofollow'` — surfaces the
#      literal string in source. Match case-insensitively (HTML/Next
#      treat NoIndex/NOINDEX as equivalent).
#   2. Object form: `robots: { index: false, ... }` — Next.js
#      generates `<meta name="robots" content="noindex">` in HTML
#      with no `noindex` text anywhere in source. We catch this by
#      finding `robots:` blocks that contain `index: false` (PCRE
#      multi-line via `grep -Pz`).
#
# Auth pages are intentionally noindex; their files go in ALLOWLIST.
#
# Tracked in docs/PERFORMANCE_OPTIMIZATION_ROADMAP.md §8 as a Phase 2
# follow-up; will be retired once a production Lighthouse workflow
# reinstates the `is-crawlable` audit against www.engezna.com.

set -euo pipefail

ALLOWLIST=(
  "src/app/[locale]/auth/layout.tsx"
)

is_allowed() {
  local file="$1"
  for allowed_path in "${ALLOWLIST[@]}"; do
    if [[ "$file" == "$allowed_path" ]]; then
      return 0
    fi
  done
  return 1
}

# Pattern 1: literal `noindex` (case-insensitive), string form.
mapfile -t STRING_HITS < <(grep -rlni 'noindex' src/ \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  || true)

# Pattern 2: `robots: { ... index: false ... }` (object form). PCRE
# multi-line: -P enables PCRE, -z treats input as a single buffer so
# `.` (with /s via inline flag) crosses newlines. Restrict the lazy
# `.*?` between `robots:` and `index:` to avoid false matches across
# unrelated objects.
mapfile -t OBJECT_HITS < <(grep -rlPz \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  '(?si)robots\s*:\s*\{[^{}]{0,500}index\s*:\s*false' src/ \
  || true)

UNEXPECTED=()
for hit in "${STRING_HITS[@]}" "${OBJECT_HITS[@]}"; do
  [[ -z "$hit" ]] && continue
  if ! is_allowed "$hit"; then
    UNEXPECTED+=("$hit")
  fi
done

# Dedupe (a file may match both patterns).
if [[ ${#UNEXPECTED[@]} -gt 0 ]]; then
  mapfile -t UNEXPECTED < <(printf '%s\n' "${UNEXPECTED[@]}" | sort -u)
fi

if [[ ${#UNEXPECTED[@]} -gt 0 ]]; then
  echo "ERROR: noindex directive found outside the allowlist:" >&2
  for f in "${UNEXPECTED[@]}"; do
    echo "  - $f" >&2
    grep -niE 'noindex|index\s*:\s*false' "$f" >&2 || true
  done
  echo "" >&2
  echo "If this is intentional, add the file to ALLOWLIST in scripts/check-noindex.sh." >&2
  echo "Otherwise remove the noindex directive — Lighthouse 'is-crawlable' is skipped" >&2
  echo "on Vercel preview runs, so this guardrail is the only check on PR CI." >&2
  exit 1
fi

TOTAL=$(( ${#STRING_HITS[@]} + ${#OBJECT_HITS[@]} ))
echo "noindex guardrail: OK (${TOTAL} expected occurrence(s) inside allowlist; ${#STRING_HITS[@]} string-form, ${#OBJECT_HITS[@]} object-form)"
