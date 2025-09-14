import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration:');
  console.error('- SUPABASE_URL:', !!supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey ? '✅ Set' : '❌ Missing');
  
  if (process.env.NODE_ENV === 'production') {
    console.error('Critical configuration missing in production environment');
    process.exit(1);
  } else {
    console.error('Please check your .env file contains the correct Supabase credentials');
  }
}

// Use service role key for server-side operations to bypass Row Level Security
export const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Test connection on server startup
if (typeof window === 'undefined' && supabaseUrl && supabaseServiceKey) {
  console.log('🔗 Testing Supabase connection...');
  
  supabase.from('tenants').select('count').limit(1).then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      console.error('Please verify your Supabase credentials and database setup');
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      console.log('✅ Supabase connection successful');
      console.log('📊 Database ready for operations');
    }
  }).catch((err) => {
    console.error('❌ Supabase connection error:', err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}