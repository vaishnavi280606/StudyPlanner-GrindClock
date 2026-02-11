// Simple test to check Supabase connection
import { supabase } from './utils/supabase.js';

console.log('Testing Supabase connection...');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test connection
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Session check:', { data, error });
});

// Test sign up
async function testSignUp() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'testpassword123'
  });
  console.log('Sign up test:', { data, error });
}

testSignUp();