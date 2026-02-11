-- =============================================
-- Fix Study Sessions Visibility for Friends
-- This allows friends to see each other's sessions for streak calculation
-- Run this in your Supabase SQL Editor
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can view own and friends sessions" ON study_sessions;

-- Create new policy that allows viewing own sessions AND friends' sessions
CREATE POLICY "Users can view own and friends sessions" ON study_sessions
    FOR SELECT USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM friends 
            WHERE status = 'accepted' 
            AND (
                (user_id = auth.uid() AND friend_id = study_sessions.user_id)
                OR 
                (friend_id = auth.uid() AND user_id = study_sessions.user_id)
            )
        )
    );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'study_sessions';
