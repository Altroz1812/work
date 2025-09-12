import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  console.error('Current values:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
  
  // Don't exit in browser environment
  if (typeof window === 'undefined') {
    process.exit(1);
  }
}

export const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: {
    persistSession: false // Disable auth persistence for server-side usage
  }
});

// Test connection
if (typeof window === 'undefined') {
  supabase.from('tenants').select('count').limit(1).then(({ error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }
  });
}