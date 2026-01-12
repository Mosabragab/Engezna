#!/usr/bin/env npx tsx
/**
 * Lighthouse Performance Audit Script
 * Store-Ready Performance Testing Tool
 *
 * Usage:
 *   npx tsx scripts/lighthouse-audit.ts [options]
 *
 * Options:
 *   --url       URL to test (default: http://localhost:3000/ar)
 *   --mobile    Run mobile audit (default)
 *   --desktop   Run desktop audit
 *   --all       Run both mobile and desktop
 *   --json      Output JSON instead of HTML
 */

import { spawn, exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const REPORTS_DIR = path.join(process.cwd(), 'e2e', 'reports')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Pages to audit
const PAGES_TO_AUDIT = [
  { path: '/ar', name: 'homepage' },
  { path: '/ar/providers', name: 'providers' },
  { path: '/ar/cart', name: 'cart' },
  { path: '/ar/auth/login', name: 'login' },
  { path: '/ar/custom-order', name: 'custom-order' },
]

// Thresholds for store readiness
const THRESHOLDS = {
  performance: 70,
  accessibility: 90,
  bestPractices: 85,
  seo: 85,
  pwa: 70,
}

interface LighthouseResult {
  page: string
  formFactor: string
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  pwa: number
  fcp: number
  lcp: number
  cls: number
  tbt: number
  tti: number
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  url: args.find(a => a.startsWith('--url='))?.split('=')[1] || BASE_URL,
  mobile: args.includes('--mobile') || !args.includes('--desktop'),
  desktop: args.includes('--desktop') || args.includes('--all'),
  json: args.includes('--json'),
  all: args.includes('--all'),
}

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true })
}

async function runLighthouse(
  url: string,
  formFactor: 'mobile' | 'desktop',
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      url,
      '--output=json',
      '--output=html',
      `--output-path=${outputPath}`,
      `--form-factor=${formFactor}`,
      '--chrome-flags="--headless --no-sandbox --disable-gpu"',
      '--quiet',
    ]

    if (formFactor === 'mobile') {
      args.push('--screenEmulation.mobile=true')
      args.push('--screenEmulation.width=412')
      args.push('--screenEmulation.height=915')
    }

    console.log(`🔍 Running Lighthouse (${formFactor}): ${url}`)

    exec(`npx lighthouse ${args.join(' ')}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`)
        reject(error)
        return
      }
      resolve(stdout)
    })
  })
}

function parseResults(jsonPath: string): Partial<LighthouseResult> {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

    return {
      performance: Math.round((data.categories?.performance?.score || 0) * 100),
      accessibility: Math.round((data.categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((data.categories?.['best-practices']?.score || 0) * 100),
      seo: Math.round((data.categories?.seo?.score || 0) * 100),
      pwa: Math.round((data.categories?.pwa?.score || 0) * 100),
      fcp: data.audits?.['first-contentful-paint']?.numericValue || 0,
      lcp: data.audits?.['largest-contentful-paint']?.numericValue || 0,
      cls: data.audits?.['cumulative-layout-shift']?.numericValue || 0,
      tbt: data.audits?.['total-blocking-time']?.numericValue || 0,
      tti: data.audits?.['interactive']?.numericValue || 0,
    }
  } catch {
    return {}
  }
}

function checkThresholds(result: Partial<LighthouseResult>): {
  passed: boolean
  failures: string[]
} {
  const failures: string[] = []

  if ((result.performance || 0) < THRESHOLDS.performance) {
    failures.push(`Performance: ${result.performance}% (min: ${THRESHOLDS.performance}%)`)
  }
  if ((result.accessibility || 0) < THRESHOLDS.accessibility) {
    failures.push(`Accessibility: ${result.accessibility}% (min: ${THRESHOLDS.accessibility}%)`)
  }
  if ((result.bestPractices || 0) < THRESHOLDS.bestPractices) {
    failures.push(`Best Practices: ${result.bestPractices}% (min: ${THRESHOLDS.bestPractices}%)`)
  }
  if ((result.seo || 0) < THRESHOLDS.seo) {
    failures.push(`SEO: ${result.seo}% (min: ${THRESHOLDS.seo}%)`)
  }

  return { passed: failures.length === 0, failures }
}

function printResult(result: LighthouseResult) {
  const check = checkThresholds(result)

  console.log(`\n📊 ${result.page} (${result.formFactor})`)
  console.log('─'.repeat(40))
  console.log(`Performance:    ${getScoreEmoji(result.performance, THRESHOLDS.performance)} ${result.performance}%`)
  console.log(`Accessibility:  ${getScoreEmoji(result.accessibility, THRESHOLDS.accessibility)} ${result.accessibility}%`)
  console.log(`Best Practices: ${getScoreEmoji(result.bestPractices, THRESHOLDS.bestPractices)} ${result.bestPractices}%`)
  console.log(`SEO:            ${getScoreEmoji(result.seo, THRESHOLDS.seo)} ${result.seo}%`)
  console.log(`PWA:            ${getScoreEmoji(result.pwa, THRESHOLDS.pwa)} ${result.pwa}%`)
  console.log('')
  console.log(`FCP: ${(result.fcp / 1000).toFixed(2)}s | LCP: ${(result.lcp / 1000).toFixed(2)}s | CLS: ${result.cls.toFixed(3)} | TBT: ${result.tbt}ms`)

  if (!check.passed) {
    console.log('\n⚠️  Threshold failures:')
    check.failures.forEach(f => console.log(`   - ${f}`))
  }
}

function getScoreEmoji(score: number, threshold: number): string {
  if (score >= 90) return '🟢'
  if (score >= threshold) return '🟡'
  return '🔴'
}

async function main() {
  console.log('═'.repeat(50))
  console.log('🚀 LIGHTHOUSE PERFORMANCE AUDIT')
  console.log('═'.repeat(50))
  console.log(`Target: ${options.url}`)
  console.log(`Mode: ${options.all ? 'Mobile + Desktop' : options.desktop ? 'Desktop' : 'Mobile'}`)
  console.log('')

  const results: LighthouseResult[] = []

  for (const page of PAGES_TO_AUDIT) {
    const url = `${options.url}${page.path}`

    if (options.mobile || options.all) {
      const outputPath = path.join(REPORTS_DIR, `lighthouse-${page.name}-mobile`)
      try {
        await runLighthouse(url, 'mobile', outputPath)
        const parsed = parseResults(`${outputPath}.report.json`)
        const result: LighthouseResult = {
          page: page.name,
          formFactor: 'mobile',
          performance: parsed.performance || 0,
          accessibility: parsed.accessibility || 0,
          bestPractices: parsed.bestPractices || 0,
          seo: parsed.seo || 0,
          pwa: parsed.pwa || 0,
          fcp: parsed.fcp || 0,
          lcp: parsed.lcp || 0,
          cls: parsed.cls || 0,
          tbt: parsed.tbt || 0,
          tti: parsed.tti || 0,
        }
        results.push(result)
        printResult(result)
      } catch (e) {
        console.error(`Failed to audit ${page.name} (mobile):`, e)
      }
    }

    if (options.desktop || options.all) {
      const outputPath = path.join(REPORTS_DIR, `lighthouse-${page.name}-desktop`)
      try {
        await runLighthouse(url, 'desktop', outputPath)
        const parsed = parseResults(`${outputPath}.report.json`)
        const result: LighthouseResult = {
          page: page.name,
          formFactor: 'desktop',
          performance: parsed.performance || 0,
          accessibility: parsed.accessibility || 0,
          bestPractices: parsed.bestPractices || 0,
          seo: parsed.seo || 0,
          pwa: parsed.pwa || 0,
          fcp: parsed.fcp || 0,
          lcp: parsed.lcp || 0,
          cls: parsed.cls || 0,
          tbt: parsed.tbt || 0,
          tti: parsed.tti || 0,
        }
        results.push(result)
        printResult(result)
      } catch (e) {
        console.error(`Failed to audit ${page.name} (desktop):`, e)
      }
    }
  }

  // Summary
  console.log('\n')
  console.log('═'.repeat(50))
  console.log('📈 SUMMARY')
  console.log('═'.repeat(50))

  const avgPerformance = results.reduce((sum, r) => sum + r.performance, 0) / results.length
  const avgAccessibility = results.reduce((sum, r) => sum + r.accessibility, 0) / results.length
  const avgBestPractices = results.reduce((sum, r) => sum + r.bestPractices, 0) / results.length
  const avgSeo = results.reduce((sum, r) => sum + r.seo, 0) / results.length

  console.log(`\nAverage Scores:`)
  console.log(`  Performance:    ${avgPerformance.toFixed(0)}%`)
  console.log(`  Accessibility:  ${avgAccessibility.toFixed(0)}%`)
  console.log(`  Best Practices: ${avgBestPractices.toFixed(0)}%`)
  console.log(`  SEO:            ${avgSeo.toFixed(0)}%`)

  // Store readiness check
  const storeReady =
    avgPerformance >= THRESHOLDS.performance &&
    avgAccessibility >= THRESHOLDS.accessibility &&
    avgBestPractices >= THRESHOLDS.bestPractices &&
    avgSeo >= THRESHOLDS.seo

  console.log('\n')
  if (storeReady) {
    console.log('✅ STORE READY: All thresholds met!')
  } else {
    console.log('❌ NOT STORE READY: Some thresholds not met')
    console.log('\nRequired thresholds:')
    console.log(`  Performance:    ${THRESHOLDS.performance}%`)
    console.log(`  Accessibility:  ${THRESHOLDS.accessibility}%`)
    console.log(`  Best Practices: ${THRESHOLDS.bestPractices}%`)
    console.log(`  SEO:            ${THRESHOLDS.seo}%`)
  }

  // Save summary JSON
  const summaryPath = path.join(REPORTS_DIR, 'lighthouse-summary.json')
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: options.url,
        results,
        averages: {
          performance: avgPerformance,
          accessibility: avgAccessibility,
          bestPractices: avgBestPractices,
          seo: avgSeo,
        },
        storeReady,
        thresholds: THRESHOLDS,
      },
      null,
      2
    )
  )

  console.log(`\n📁 Reports saved to: ${REPORTS_DIR}`)
  console.log(`   - lighthouse-summary.json`)
  console.log(`   - lighthouse-[page]-[device].report.html`)
  console.log(`   - lighthouse-[page]-[device].report.json`)

  process.exit(storeReady ? 0 : 1)
}

main().catch(console.error)
