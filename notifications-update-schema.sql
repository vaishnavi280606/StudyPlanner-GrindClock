-- =============================================
--  Notifications Table Updates
--  Run this in your Supabase SQL Editor
-- =============================================

-- Add metadata column to notifications table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Make content nullable (since we'll use metadata for some notification types)
ALTER TABLE notifications ALTER COLUMN content DROP NOT NULL;

-- Drop the old CHECK constraint on type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new CHECK constraint with updated types including session notifications
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('friend_request', 'message', 'call', 'call_ended', 'group_added', 'session_request', 'session_accepted', 'session_rejected'));

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING gin(metadata);
