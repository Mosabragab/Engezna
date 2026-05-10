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

# Run grep and return matching lines via nameref array. Exit code 1
# from grep (no matches) is success; anything >=2 (regex compile
# error, IO error) is fatal — silently masking those would defeat
# the whole guardrail, which is exactly how earlier CI bugs slipped
# through (e.g. the Lighthouse artifact silent "no files found"
# warning from PR #373).
collect_hits() {
  local label="$1"
  local -n out_array="$2"
  shift 2
  local out rc=0
  set +e
  out=$("$@")
  rc=$?
  set -e
  if [[ $rc -gt 1 ]]; then
    echo "ERROR: $label grep failed with exit code $rc: $*" >&2
    exit "$rc"
  fi
  if [[ -n "$out" ]]; then
    mapfile -t out_array <<<"$out"
  else
    out_array=()
  fi
}

# Pattern 1: literal `noindex` (case-insensitive), string form.
collect_hits "string-form" STRING_HITS \
  grep -rlni 'noindex' src/ \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx'

# Pattern 2: `robots: { ... index: false ... }` (object form). PCRE
# multi-line: -P enables PCRE, -z treats input as a single buffer so
# `.` (with /s via inline flag) crosses newlines. Restrict the lazy
# `.*?` between `robots:` and `index:` to avoid false matches across
# unrelated objects.
collect_hits "object-form" OBJECT_HITS \
  grep -rlPz \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  '(?si)robots\s*:\s*\{[^{}]{0,500}index\s*:\s*false' src/

UNEXPECTED=()
declare -A SEEN
for hit in "${STRING_HITS[@]}" "${OBJECT_HITS[@]}"; do
  [[ -z "$hit" || -n "${SEEN[$hit]:-}" ]] && continue
  SEEN["$hit"]=1
  if ! is_allowed "$hit"; then
    UNEXPECTED+=("$hit")
  fi
done

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

TOTAL=${#SEEN[@]}
echo "noindex guardrail: OK (${TOTAL} unique allowlisted file(s); ${#STRING_HITS[@]} string-form match(es), ${#OBJECT_HITS[@]} object-form match(es))"
