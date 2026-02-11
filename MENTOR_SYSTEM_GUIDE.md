# Mentor Session System - Setup Guide

## Database Setup

1. **Run the schema migration:**
   Execute the SQL file in your Supabase SQL Editor:
   ```bash
   # Open Supabase Dashboard → SQL Editor → New Query
   # Copy and paste contents of: mentor-sessions-schema.sql
   ```

2. **Tables Created:**
   - `mentor_sessions` - Stores all mentor-student session bookings
   - `mentor_availability` - Stores mentor weekly availability slots
   - `mentor_students` - Tracks mentor-student relationships and session history

## Features Implemented

### For Students:
- **Browse Mentors**: View all users with role='mentor' from user_profiles
- **Book Sessions**: Click "Book Session" to request a session with a mentor
  - Select subject, date, time, duration
  - Add notes about what you want to learn
  - See estimated cost based on mentor's hourly rate
- **Session Requests**: Sent to mentor for approval
- **View Sessions**: See your upcoming and past mentor sessions

### For Mentors:
- **Dashboard**: Beautiful mentor dashboard with statistics
  - Total students count
  - Upcoming sessions
  - Sessions completed today
  - Average rating from students
- **Session Management**: 
  - View all pending, confirmed, completed sessions
  - Confirm or decline pending session requests
  - See student notes for each session
  - Start video calls directly from dashboard
- **Student Management**:
  - View all your students
  - Track total sessions per student
  - See subjects taught to each student
  - Quick video call and chat access
- **Real-time Data**: Fetches actual data from Supabase

### Role Detection:
- System automatically detects if user is student or mentor
- Navigation shows "Mentors" for students, "My Students" for mentors
- Appropriate view rendered based on role

## How It Works

1. **User Signs Up**: Chooses role (student/mentor) during signup
2. **Mentor Profile**: Set profession, experience in Settings
3. **Student Books Session**: 
   - Finds mentor in "Mentors" section
   - Clicks "Book Session"
   - Fills booking form
   - Request sent to mentor
4. **Mentor Confirms**:
   - Sees pending request in dashboard
   - Can confirm or decline
   - Confirmation sends notification to student
5. **Session Happens**:
   - Both parties can join video call
   - Chat available for communication
   - Session tracked in database
6. **After Session**:
   - Mentor can add feedback
   - Student can rate mentor
   - Session history maintained

## API Functions (supabase-queries.ts)

### Session Management:
- `fetchMentorSessions(mentorId)` - Get all sessions for a mentor
- `fetchStudentSessions(studentId)` - Get all sessions for a student
- `createMentorSession()` - Student books a session
- `confirmMentorSession(sessionId)` - Mentor confirms booking
- `cancelMentorSession(sessionId)` - Cancel a session
- `completeMentorSession()` - Mark session as completed

### Student Management:
- `fetchMentorStudents(mentorId)` - Get all students of a mentor
- Auto-updated when sessions are completed

### Mentor Discovery:
- `fetchMentorsFromProfiles()` - Get all users with role='mentor'

### Availability (Future):
- `fetchMentorAvailability(mentorId)`
- `setMentorAvailability()`
- `removeMentorAvailability()`

## Components

### MentorDashboard.tsx
- Complete dashboard for mentors
- Tabs: Overview, Sessions, My Students, Schedule
- Real-time data loading
- Session actions (confirm/cancel)
- Video call and chat integration

### MentorConnect.tsx
- Student view for finding mentors
- Search and filter by expertise
- Booking modal with form
- Session request system

## Database Schema Highlights

### mentor_sessions table:
```sql
- mentor_id (user reference)
- student_id (user reference)  
- subject (text)
- scheduled_time (timestamp)
- duration_minutes (integer)
- status (pending/confirmed/completed/cancelled)
- notes, meeting_link, feedback, rating
```

### Triggers:
- Auto-update `mentor_students` table when session completed
- Track total sessions and last session date
- Maintain subjects list per student

### RLS Policies:
- Users can only view their own sessions
- Students can create booking requests
- Both parties can update/cancel sessions

## Next Steps (Optional Enhancements)

1. **Schedule Through Chat**: Add quick commands in chat like "/schedule tomorrow 3pm"
2. **Calendar View**: Visual calendar showing all sessions
3. **Availability Management**: Mentors set weekly availability, students see open slots
4. **Payment Integration**: Add Stripe/PayPal for session payments
5. **Session Notes**: Rich text editor for session summaries
6. **Recording**: Option to record and store session videos
7. **Ratings & Reviews**: Detailed rating system with reviews
8. **Notifications**: Email/SMS reminders for upcoming sessions

## Testing

1. Create two accounts: one as student, one as mentor
2. As student, browse mentors and book a session
3. As mentor, check dashboard for pending request
4. Confirm the session
5. Both can start video call and chat

## Troubleshooting

- **No mentors showing**: Ensure at least one user has role='mentor' in user_profiles
- **Booking fails**: Check browser console for errors, verify Supabase RLS policies
- **Dashboard empty**: New mentors won't have data until students book sessions
- **Sessions not loading**: Verify mentor-sessions-schema.sql was executed successfully
