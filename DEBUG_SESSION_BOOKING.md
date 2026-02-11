# Debug Guide: Session Booking System

## How to Test and Debug

I've added extensive console logging throughout the system. Here's how to debug:

### 1. Open Browser Console
- Press **F12** in your browser
- Go to the **Console** tab
- Clear the console (trash icon)

### 2. Test as Student

#### A. Book a Session
1. Login as a student
2. Go to "Mentor Connect"
3. Click on a mentor
4. Click "Request Session"
5. Fill in the topic (required)
6. Click "Send Request"

**Expected Console Logs:**
```
Starting session request...
Submitting request: {mentor_id: "...", student_id: "...", ...}
Creating session request: {mentor_id: "...", student_id: "...", ...}
Session request created successfully: {...}
Sending notification to mentor: ...
Session request created successfully!
Reloading requests...
Loading my requests for user: ...
Fetching session requests for: {userId: "...", role: "student"}
Raw session requests from DB: [...]
Transformed session requests: [...]
Loaded session requests: [...]
Switching to sessions view
My Requests: [...]
Pending Requests: [...]
Accepted Requests: [...]
```

#### B. Check Pending Requests
1. After booking, you should see "My Sessions" tab active
2. Look for "Pending Requests" section
3. Your request should appear with amber "Pending" badge

**Console should show:**
```
My Requests: [{ id: "...", status: "pending", ... }]
Pending Requests: [{ id: "...", status: "pending", ... }]
Accepted Requests: []
```

#### C. Reload Page
1. Press F5 to reload
2. Go back to "Mentor Connect"
3. Click "My Sessions" tab

**Expected:** Pending request should still be there

### 3. Test as Mentor

#### A. Check Notifications
1. Login as a mentor (use the account you sent request to)
2. Check if notification sound played
3. Click bell icon to see notifications

**Expected Console Logs:**
```
Session request notification received: {...}
```

#### B. Check Pending Requests
1. Go to "Mentor Dashboard"
2. Click "Student Requests" tab
3. Look for "Pending Requests" section

**Expected Console Logs:**
```
MentorDashboard: Loading data for user: ...
Fetching session requests for: {userId: "...", role: "mentor"}
Raw session requests from DB: [...]
Transformed session requests: [...]
Loaded session requests: [...]
MentorDashboard - Session Requests: [...]
MentorDashboard - Pending Requests: [{ status: "pending", ... }]
MentorDashboard - Accepted Requests: []
```

#### C. Accept Request
1. Click "Respond" button on a pending request
2. (Optional) Add response message
3. (Optional) Add meeting link
4. Click "Accept"

**Expected:** Request should disappear from pending list

### 4. Verify After Acceptance

#### Student Side:
1. Login as student
2. Go to "Mentor Connect" → "My Sessions"
3. Check "Upcoming Sessions" section

**Expected Console Logs:**
```
Session accepted notification received: {...}
Session request change detected, reloading...
Loading my requests for user: ...
Fetching session requests for: {userId: "...", role: "student"}
Transformed session requests: [{ status: "accepted", ... }]
My Requests: [{ status: "accepted", ... }]
Pending Requests: []
Accepted Requests: [{ status: "accepted", ... }]
```

**Expected UI:**
- Green bordered card in "Upcoming Sessions"
- "Confirmed" badge
- "Start Video Call" button enabled
- "Chat with Mentor" button enabled

---

## Common Issues & Solutions

### Issue 1: No Console Logs at All
**Problem:** Code is not running
**Solution:** 
- Check if dev server is running
- Run `npm run dev` in terminal
- Check browser console for errors

### Issue 2: "Raw session requests from DB: []"
**Problem:** No data in database
**Solution:**
- Check if session_requests table exists in Supabase
- Verify user IDs are correct
- Check RLS policies in Supabase

### Issue 3: Logs show data but UI doesn't update
**Problem:** State not updating or wrong filter
**Solution:**
- Check "My Requests" log - should have data
- Check "Pending Requests" log - should filter correctly
- Verify `status` field is exactly "pending" (not "Pending")

### Issue 4: Data doesn't persist after reload
**Problem:** Not fetching from database correctly
**Solution:**
- Look for "Fetching session requests" log on page load
- Check if "Raw session requests from DB" shows data
- Verify foreign key relationships in database

### Issue 5: Mentor doesn't receive notification
**Problem:** Notification not created or subscription not working
**Solution:**
- Check for "Sending notification to mentor" log
- Verify mentor's user ID is correct
- Check notifications table in Supabase

### Issue 6: Real-time updates not working
**Problem:** Subscription not set up
**Solution:**
- Look for "Session request change detected, reloading..." log
- Check Supabase real-time is enabled for session_requests table
- Verify subscription channel is created

---

## Database Check

### Verify Tables Exist

Run these queries in Supabase SQL Editor:

```sql
-- Check session_requests table
SELECT * FROM session_requests ORDER BY created_at DESC LIMIT 10;

-- Check if your test data is there
SELECT 
    sr.id,
    sr.status,
    sr.topic,
    sr.created_at,
    sp.full_name as student_name,
    mp.full_name as mentor_name
FROM session_requests sr
LEFT JOIN user_profiles sp ON sp.user_id = sr.student_id
LEFT JOIN user_profiles mp ON mp.user_id = sr.mentor_id
ORDER BY sr.created_at DESC
LIMIT 10;
```

### Check RLS Policies

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'session_requests';

-- View policies
SELECT * FROM pg_policies WHERE tablename = 'session_requests';
```

### Enable Real-time (if not already)

1. Go to Supabase Dashboard
2. Database → Replication
3. Find `session_requests` table
4. Enable real-time updates

---

## Step-by-Step Debugging Process

1. **Start Fresh:**
   - Clear browser console
   - Clear any existing session requests
   - Reload page

2. **Test Student Booking:**
   - Follow student steps above
   - Copy all console logs
   - Note what appears/doesn't appear

3. **Test Mentor Side:**
   - Open in different browser/incognito
   - Login as mentor
   - Copy all console logs

4. **Share Results:**
   - Share console logs showing exactly what you see
   - Screenshot the UI showing what's missing
   - Note the specific step where it fails

---

## Quick Test Script

Copy this into browser console to see current state:

```javascript
// Check current user
console.log('Current User:', await supabase.auth.getUser());

// Check session requests as student
const { data: studentRequests } = await supabase
  .from('session_requests')
  .select('*')
  .eq('student_id', 'YOUR_USER_ID_HERE');
console.log('Student Requests:', studentRequests);

// Check session requests as mentor
const { data: mentorRequests } = await supabase
  .from('session_requests')
  .select('*')
  .eq('mentor_id', 'YOUR_USER_ID_HERE');
console.log('Mentor Requests:', mentorRequests);
```

---

**Now try booking a session and share the console logs with me!**
