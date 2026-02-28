-- =====================================================
-- CONSOLIDATED DATABASE SETUP & FIXES
-- =====================================================
-- Run this SQL in your Supabase SQL Editor as a single script

-- 1. Ensure uuid extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create session_requests table
CREATE TABLE IF NOT EXISTS session_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES mentorship_offerings(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    student_message TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    mode TEXT CHECK (mode IN ('chat', 'call', 'video')) DEFAULT 'video',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    mentor_response TEXT,
    meeting_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_requests_mentor_id ON session_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_student_id ON session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status);
CREATE INDEX IF NOT EXISTS idx_session_requests_created_at ON session_requests(created_at DESC);

ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Students can view own session requests" ON session_requests;
    DROP POLICY IF EXISTS "Mentors can view their session requests" ON session_requests;
    DROP POLICY IF EXISTS "Students can create session requests" ON session_requests;
    DROP POLICY IF EXISTS "Mentors can update their session requests" ON session_requests;
    DROP POLICY IF EXISTS "Students can update own session requests" ON session_requests;
END $$;

CREATE POLICY "Students can view own session requests" ON session_requests FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Mentors can view their session requests" ON session_requests FOR SELECT USING (auth.uid() = mentor_id);
CREATE POLICY "Students can create session requests" ON session_requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Mentors can update their session requests" ON session_requests FOR UPDATE USING (auth.uid() = mentor_id);
CREATE POLICY "Students can update own session requests" ON session_requests FOR UPDATE USING (auth.uid() = student_id);

-- 3. Update Notifications table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB;
    END IF;
END $$;

ALTER TABLE notifications ALTER COLUMN content DROP NOT NULL;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('friend_request', 'message', 'call', 'call_ended', 'group_added', 'session_request', 'session_accepted', 'session_rejected', 'session_completed', 'session_cancelled', 'session_reminder', 'new_review'));

CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING gin(metadata);

-- 4. Enable real-time
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_requests;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON session_requests TO authenticated;
GRANT ALL ON session_requests TO service_role;

RAISE NOTICE '✅ Consolidated DB fixes applied successfully!';
