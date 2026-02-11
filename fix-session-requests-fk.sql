-- =============================================
-- Fix Session Requests Table Foreign Keys
-- Run this in your Supabase SQL Editor
-- =============================================

-- First, ensure session_requests table exists with proper columns
CREATE TABLE IF NOT EXISTS session_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    topic TEXT NOT NULL,
    message TEXT DEFAULT '',
    preferred_date DATE,
    preferred_time TEXT,
    duration INTEGER DEFAULT 30,
    mode TEXT DEFAULT 'video' CHECK (mode IN ('video', 'chat')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints to user_profiles if they don't exist
-- First check if foreign keys exist and drop them
ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS session_requests_student_id_fkey;
ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS session_requests_mentor_id_fkey;

-- Create the foreign key relationships needed for the join
-- Note: These reference auth.users, but we need to join with user_profiles via user_id
-- So we add explicit foreign keys to user_profiles

-- Add student_id -> user_profiles.user_id relationship
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_requests_student_profile_fkey'
    ) THEN
        ALTER TABLE session_requests 
        ADD CONSTRAINT session_requests_student_profile_fkey 
        FOREIGN KEY (student_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add student_profile foreign key: %', SQLERRM;
END $$;

-- Add mentor_id -> user_profiles.user_id relationship  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_requests_mentor_profile_fkey'
    ) THEN
        ALTER TABLE session_requests 
        ADD CONSTRAINT session_requests_mentor_profile_fkey 
        FOREIGN KEY (mentor_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add mentor_profile foreign key: %', SQLERRM;
END $$;

-- Enable RLS
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for session_requests
DROP POLICY IF EXISTS "Users can view own session requests" ON session_requests;
CREATE POLICY "Users can view own session requests" ON session_requests
    FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can create session requests" ON session_requests;
CREATE POLICY "Students can create session requests" ON session_requests
    FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update own session requests" ON session_requests;
CREATE POLICY "Users can update own session requests" ON session_requests
    FOR UPDATE USING (auth.uid() = mentor_id OR auth.uid() = student_id);

-- Verify setup
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'session_requests' AND tc.constraint_type = 'FOREIGN KEY';
