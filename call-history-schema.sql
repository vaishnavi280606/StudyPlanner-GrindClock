-- =============================================
--  Call History Table
--  Run this in your Supabase SQL Editor
-- =============================================

-- Create call history table
CREATE TABLE IF NOT EXISTS call_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    call_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own call history" ON call_history;
CREATE POLICY "Users can view their own call history" ON call_history
    FOR SELECT USING (
        auth.uid() = caller_id OR auth.uid() = receiver_id
    );

DROP POLICY IF EXISTS "Users can insert their own calls" ON call_history;
CREATE POLICY "Users can insert their own calls" ON call_history
    FOR INSERT WITH CHECK (
        auth.uid() = caller_id
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_history_caller ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver ON call_history(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_history_time ON call_history(call_time DESC);

-- Function to get total talk time between two users
CREATE OR REPLACE FUNCTION get_total_talk_time(user1_id UUID, user2_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE((
        SELECT SUM(duration_seconds)
        FROM call_history
        WHERE (caller_id = user1_id AND receiver_id = user2_id)
           OR (caller_id = user2_id AND receiver_id = user1_id)
    ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
