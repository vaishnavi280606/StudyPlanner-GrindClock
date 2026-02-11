# Authentication Setup Guide

## Quick Demo Setup

To test the authentication system immediately, you can use demo credentials:

### Option 1: Use Demo Mode (No Supabase Required)
1. Comment out the Supabase import in `src/utils/supabase.ts`
2. The app will work with local storage only

### Option 2: Full Supabase Setup
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings > API in your Supabase dashboard
4. Copy your Project URL and anon public key
5. Update `.env.local` with your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Run the app with `npm run dev`

## Features Added

✅ **Login/Signup Page** - Beautiful dark theme matching your app
✅ **Protected Routes** - App only accessible when logged in  
✅ **User Profile** - Shows user email and sign out option
✅ **Loading States** - Smooth loading experience
✅ **Error Handling** - Clear error messages
✅ **Responsive Design** - Works on mobile and desktop

## Test Credentials (if using Supabase)
- Create any email/password combination
- Check your email for confirmation link (if email confirmation is enabled)
- Or disable email confirmation in Supabase Auth settings for faster testing

The authentication system is now fully integrated with your existing study planner app!