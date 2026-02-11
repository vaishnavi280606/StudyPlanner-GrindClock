-- =====================================================
-- SESSION REQUESTS TABLE SCHEMA - FIXED VERSION
-- =====================================================
-- This creates the session_requests table with proper foreign keys
-- Run this SQL in your Supabase SQL Editor

-- First, ensure uuid extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop table if exists (be careful in production!)
DROP TABLE IF EXISTS session_requests CASCADE;

-- Create session_requests table
CREATE TABLE session_requests (
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

-- Create indexes for better performance
CREATE INDEX idx_session_requests_mentor_id ON session_requests(mentor_id);
CREATE INDEX idx_session_requests_student_id ON session_requests(student_id);
CREATE INDEX idx_session_requests_status ON session_requests(status);
CREATE INDEX idx_session_requests_created_at ON session_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own session requests" ON session_requests;
DROP POLICY IF EXISTS "Mentors can view their session requests" ON session_requests;
DROP POLICY IF EXISTS "Students can create session requests" ON session_requests;
DROP POLICY IF EXISTS "Mentors can update their session requests" ON session_requests;
DROP POLICY IF EXISTS "Students can update own session requests" ON session_requests;

-- RLS Policies for session_requests

-- Students can view their own session requests
CREATE POLICY "Students can view own session requests"
    ON session_requests
    FOR SELECT
    USING (auth.uid() = student_id);

-- Mentors can view session requests sent to them
CREATE POLICY "Mentors can view their session requests"
    ON session_requests
    FOR SELECT
    USING (auth.uid() = mentor_id);

-- Students can create session requests
CREATE POLICY "Students can create session requests"
    ON session_requests
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Mentors can update session requests sent to them
CREATE POLICY "Mentors can update their session requests"
    ON session_requests
    FOR UPDATE
    USING (auth.uid() = mentor_id);

-- Students can update their own session requests (e.g., cancel)
CREATE POLICY "Students can update own session requests"
    ON session_requests
    FOR UPDATE
    USING (auth.uid() = student_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_session_requests_updated_at ON session_requests;

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_session_requests_updated_at
    BEFORE UPDATE ON session_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time for session_requests (if publication exists)
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_requests;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Grant permissions
GRANT ALL ON session_requests TO authenticated;
GRANT ALL ON session_requests TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Session requests table created successfully!';
    RAISE NOTICE 'You can now use the session booking feature.';
END $$;
