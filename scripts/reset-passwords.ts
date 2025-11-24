#!/usr/bin/env tsx
/**
 * Reset Test User Passwords
 *
 * This script resets passwords for all test users using the Supabase Admin API.
 * It requires the SUPABASE_SERVICE_ROLE_KEY environment variable to be set.
 *
 * Usage:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file
 *   2. Run: npx tsx scripts/reset-passwords.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  console.error('\nTo get your service role key:')
  console.error('1. Go to: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/settings/api')
  console.error('2. Copy the "service_role" key (NOT the anon key)')
  console.error('3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here')
  process.exit(1)
}

// Create admin client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const TEST_PASSWORD = 'Test123!'

const TEST_USERS = [
  { email: 'customer@test.com', role: 'customer' },
  { email: 'provider@test.com', role: 'provider_owner' },
  { email: 'admin@test.com', role: 'admin' },
  { email: 'dr.mosab@hotmail.com', role: 'customer' },
]

async function resetPasswords() {
  console.log('🔧 Starting password reset for test users...\n')

  // Fetch all users
  const { data: users, error: fetchError } = await supabaseAdmin.auth.admin.listUsers()

  if (fetchError) {
    console.error('❌ Failed to fetch users:', fetchError.message)
    return
  }

  let successCount = 0
  let failCount = 0

  for (const testUser of TEST_USERS) {
    const user = users.users.find(u => u.email === testUser.email)

    if (!user) {
      console.log(`⚠️  User not found: ${testUser.email}`)
      failCount++
      continue
    }

    console.log(`🔄 Resetting password for: ${testUser.email}`)

    // Update password using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: TEST_PASSWORD }
    )

    if (error) {
      console.error(`   ❌ Failed: ${error.message}`)
      failCount++
    } else {
      console.log(`   ✅ Success! Password set to: ${TEST_PASSWORD}`)
      successCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary:')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log('='.repeat(60))

  if (successCount > 0) {
    console.log('\n🎉 Password reset complete!')
    console.log('\n📝 Test Credentials:')
    console.log('   Password for all users: Test123!')
    console.log('\n   Users:')
    TEST_USERS.forEach(user => {
      console.log(`   • ${user.email}`)
    })
    console.log('\n🚀 You can now try logging in!')
  }
}

// Run the script
resetPasswords().catch(console.error)
