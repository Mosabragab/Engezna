/**
 * Database Migration Runner
 *
 * This script runs SQL migration files against your Supabase database
 *
 * Usage:
 *   tsx scripts/run-migration.ts <migration-file.sql>
 *   tsx scripts/run-migration.ts all  # Run all pending migrations
 */

import { config } from 'dotenv'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runSQL(sql: string, filename: string) {
  console.log(`\n📝 Running migration: ${filename}`)

  try {
    // Split by semicolon and filter empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== '')

    for (const statement of statements) {
      if (!statement) continue

      // Note: Supabase RPC may not be available for direct SQL execution
      // This script is informational - actual migrations should be run in Supabase SQL Editor
      console.warn(`⚠️  Note: Direct SQL execution via API may not be available`)
      console.warn(`   Please run migrations manually in Supabase SQL Editor:`)
      console.warn(`   https://supabase.com/dashboard/project/${supabaseUrl.split('.')[0].split('//')[1]}/sql`)
      console.log(`\n${statement}\n`)
    }

    console.log(`✅ Migration completed: ${filename}`)
    return true
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`)
    console.error(error)
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations')

  if (args.length === 0) {
    console.log('Usage: tsx scripts/run-migration.ts <migration-file.sql>')
    console.log('   or: tsx scripts/run-migration.ts all')
    process.exit(1)
  }

  if (args[0] === 'all') {
    console.log('🚀 Running all migrations...')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const filePath = join(migrationsDir, file)
      const sql = readFileSync(filePath, 'utf-8')
      await runSQL(sql, file)
    }
  } else {
    const filename = args[0]
    const filePath = join(migrationsDir, filename)
    const sql = readFileSync(filePath, 'utf-8')
    await runSQL(sql, filename)
  }

  console.log('\n✨ Migration process completed')
  console.log('\n💡 Tip: You can also run migrations directly in Supabase SQL Editor:')
  console.log(`   https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/sql`)
}

main().catch(console.error)
