import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('⚠️ Supabase credentials missing or using placeholder. Authentication will fail.');
  console.log('Current URL:', supabaseUrl || 'None');
} else {
  console.log('✅ Supabase initialized with URL:', supabaseUrl.substring(0, 20) + '...');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);