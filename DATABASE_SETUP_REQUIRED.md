# 🔧 URGENT FIX: Database Setup Required

## ❌ Current Problem

Your database is missing the `session_requests` table, which is why you're seeing these errors:

```
Could not find a relationship between 'session_requests' and 'user_profiles' in the schema cache
POST .../notifications 400 (Bad Request)
```

## ✅ Solution: Run These SQL Scripts

### Step 1: Go to Supabase Dashboard

1. Open your Supabase project: https://supabase.com/dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run session-requests-schema.sql

Copy and paste the ENTIRE contents of `session-requests-schema.sql` file into the SQL Editor and click "Run".

This will:
- ✅ Create the `session_requests` table
- ✅ Set up proper foreign keys to `auth.users`
- ✅ Create indexes for performance
- ✅ Enable Row Level Security (RLS) policies
- ✅ Enable real-time subscriptions
- ✅ Grant proper permissions

### Step 3: Update Notifications Table

Copy and paste the ENTIRE contents of `notifications-update-schema.sql` file into the SQL Editor and click "Run".

This will:
- ✅ Add `session_request`, `session_accepted`, `session_rejected` to allowed notification types
- ✅ Update the CHECK constraint

### Step 4: Verify Tables Exist

Run this query to check:

```sql
-- Check if session_requests table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'session_requests'
);

-- View the table structure
SELECT * FROM session_requests LIMIT 0;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'session_requests';
```

### Step 5: Enable Real-time (Important!)

1. In Supabase Dashboard, go to **Database** → **Replication**
2. Find `session_requests` table in the list
3. Click the toggle to **enable real-time**
4. Also enable for `notifications` table if not already enabled

---

## 🎯 After Running the SQL Scripts

### Test the System:

1. **Refresh your app** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser console** (trash icon)
3. **Book a session** as a student
4. **Check console logs** - you should now see:
   ```
   ✅ Creating session request: {...}
   ✅ Session request created successfully: {...}
   ✅ Sending notification to mentor: ...
   ✅ Fetching session requests for: {...}
   ✅ Raw session requests from DB: [{...}]  <- Should have data now!
   ✅ === Number of requests: 1  <- Should be > 0
   ✅ === RENDER - Pending Requests: [{...}]  <- Should show your request
   ```

---

## 🔍 Still Having Issues?

### Check Foreign Key Relationships

Run this query to verify foreign keys are set up correctly:

```sql
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='session_requests';
```

Expected output should show:
- `mentor_id` → `auth.users.id`
- `student_id` → `auth.users.id`

### Check RLS Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'session_requests'
ORDER BY policyname;
```

You should see policies like:
- Students can view own session requests
- Mentors can view their session requests
- Students can create session requests
- Mentors can update their session requests
- Students can update own session requests

### Check Notifications Table

```sql
-- Check if notifications table exists and has correct structure
\d notifications;

-- Check notification type constraint
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname = 'notifications_type_check';
```

---

## 📝 Summary

**You MUST run the SQL scripts before the app will work!**

The database tables don't exist yet, which is why you're getting 400 Bad Request errors.

After running the scripts:
1. ✅ `session_requests` table will exist
2. ✅ Foreign keys will be set up
3. ✅ RLS policies will allow reads/writes
4. ✅ Notifications will support session types
5. ✅ Real-time updates will work

**Run the SQL scripts now, then test again!** 🚀
