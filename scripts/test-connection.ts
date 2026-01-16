/**
 * Test Supabase Database Connection
 *
 * This script verifies that your Supabase connection is working correctly
 *
 * Usage:
 *   npm run db:test
 */

import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  console.error('\n💡 Make sure .env.local file exists with proper credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('📋 Configuration:');
    console.log('   URL:', supabaseUrl);
    console.log('   Anon Key:', supabaseAnonKey?.substring(0, 20) + '...');
    console.log('');

    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data: healthData, error: healthError } = await supabase
      .from('_migrations')
      .select('*')
      .limit(1);

    if (healthError && !healthError.message.includes('does not exist')) {
      throw new Error(`Connection failed: ${healthError.message}`);
    }
    console.log('   ✅ Connection successful!\n');

    // Test 2: List tables
    console.log('2️⃣ Fetching table information...');
    let tablesData = null;
    let tablesError = null;
    try {
      const result = await supabase.rpc('get_tables');
      tablesData = result.data;
      tablesError = result.error;
    } catch (e) {
      // RPC function may not exist
    }

    if (tablesError) {
      console.log('   ℹ️  Cannot fetch table list (may need custom RPC function)');
    } else if (tablesData) {
      console.log('   📊 Available tables:', tablesData);
    } else {
      console.log('   ℹ️  No tables found or RPC not available');
    }
    console.log('');

    // Test 3: Auth service
    console.log('3️⃣ Testing Auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.log('   ⚠️  Auth check failed:', authError.message);
    } else {
      console.log('   ✅ Auth service is available');
      console.log('   Session:', authData.session ? 'Active' : 'No active session');
    }
    console.log('');

    // Test 4: Storage service
    console.log('4️⃣ Testing Storage service...');
    const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log('   ⚠️  Storage check failed:', bucketsError.message);
    } else {
      console.log('   ✅ Storage service is available');
      console.log(
        '   Buckets:',
        bucketsData.length > 0 ? bucketsData.map((b) => b.name).join(', ') : 'No buckets found'
      );
    }
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Connection test completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Create your database schema in supabase/migrations/');
    console.log('   2. Run migrations: npm run db:migrate');
    console.log(
      '   3. Or use Supabase Dashboard: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/editor'
    );
    console.log('');
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check your .env.local file');
    console.error(
      '   2. Verify credentials at: https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr/settings/api'
    );
    console.error('   3. Ensure your Supabase project is active');
    process.exit(1);
  }
}

testConnection();
