/**
 * Script to reset test user passwords using Supabase Admin API
 * 
 * Usage: npx ts-node scripts/reset-test-passwords.ts
 * 
 * This script properly sets passwords for test accounts that were created
 * directly in Supabase without going through the auth flow.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  console.error('You can find it in Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Test accounts to reset
const testAccounts = [
  { email: 'customer@test.com', password: 'Test123!' },
  { email: 'provider@test.com', password: 'Test123!' },
  { email: 'admin@test.com', password: 'Test123!' },
]

async function resetPasswords() {
  console.log('🔐 Resetting test user passwords...\n')

  for (const account of testAccounts) {
    try {
      // First, get the user ID from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
      
      if (userError) {
        console.error(`❌ Error listing users: ${userError.message}`)
        continue
      }

      const user = userData.users.find(u => u.email === account.email)
      
      if (!user) {
        console.log(`⚠️  User ${account.email} not found, creating...`)
        
        // Create the user with the correct password
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        })

        if (createError) {
          console.error(`❌ Failed to create ${account.email}: ${createError.message}`)
        } else {
          console.log(`✅ Created ${account.email} with password`)
        }
        continue
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: account.password }
      )

      if (updateError) {
        console.error(`❌ Failed to reset ${account.email}: ${updateError.message}`)
      } else {
        console.log(`✅ Reset password for ${account.email}`)
      }
    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error)
    }
  }

  console.log('\n🎉 Password reset complete!')
  console.log('\nTest credentials:')
  testAccounts.forEach(acc => {
    console.log(`  📧 ${acc.email} / ${acc.password}`)
  })
}

resetPasswords()
