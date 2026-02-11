# Setup Mentor Database Tables

## The app is showing a blank page because the new database tables haven't been created yet.

Follow these steps to set up the mentor system in your Supabase database:

### Step 1: Go to your Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Schema
1. Click **New Query**
2. Copy the entire contents of `mentor-profiles-schema.sql`
3. Paste it into the SQL editor
4. Click **Run** or press `Ctrl+Enter`

### Step 3: Verify Tables Created
Go to **Table Editor** and verify these tables exist:
- `mentorship_offerings`
- `session_requests`
- `mentor_reviews`

Also verify that `user_profiles` table now has these new columns:
- `domain`
- `experience_years`
- `company`
- `college`
- `bio`
- `skills`
- `languages`
- `rating`
- `total_reviews`
- `is_verified`

### Step 4: Refresh Your App
Once the tables are created, refresh your browser at http://localhost:5174/

### Troubleshooting

**If you get errors about existing functions:**
The schema uses `CREATE OR REPLACE FUNCTION` so it should work even if some functions already exist.

**If you get errors about the trigger:**
Some triggers from the old schema might conflict. You can drop them first:
```sql
DROP TRIGGER IF EXISTS update_mentor_rating_after_review ON mentor_reviews;
DROP FUNCTION IF EXISTS update_mentor_rating();
```

**Check the browser console:**
Press F12 in your browser and check the Console tab for any error messages.

### What's Different Now?

The mentor system has been completely redesigned:

**For Mentors:**
- Profile editing (domain, experience, skills, languages)
- Create mentorship offerings (1:1, doubt solving, resume review, etc.)
- Accept/reject student requests
- View all pending and accepted sessions

**For Students:**
- Browse mentor profiles
- Filter by domain/skills
- Request sessions with specific topics
- See mentor ratings and reviews
- Direct chat/video call with mentors

All mentor navigation has been simplified - mentors only see:
- My Students (their dashboard)
- Friends
- Settings
