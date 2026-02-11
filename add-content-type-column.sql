-- Add content_type column to messages table for image/voice/video support
-- Run this in your Supabase SQL Editor

-- 1. Add content_type to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';

-- 2. Create group_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add content_type to group_messages in case the table already existed without it
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';

-- 4. Enable RLS
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- 5. Allow authenticated users to read/insert group messages
DROP POLICY IF EXISTS "Users can read group messages" ON group_messages;
CREATE POLICY "Users can read group messages"
    ON group_messages FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert group messages" ON group_messages;
CREATE POLICY "Users can insert group messages"
    ON group_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- 6. Enable realtime for group_messages
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
