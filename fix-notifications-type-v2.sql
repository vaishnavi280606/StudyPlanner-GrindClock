-- =============================================
--  Fix Notifications Type Constraint v2
--  Adds 'new_review' type for mentor review notifications
--  Run this in your Supabase SQL Editor
-- =============================================

-- Drop the old CHECK constraint on type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new CHECK constraint with ALL notification types including new_review
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'friend_request', 
        'message', 
        'call', 
        'call_ended', 
        'group_added', 
        'session_request', 
        'session_accepted', 
        'session_rejected',
        'session_completed',
        'session_cancelled',
        'session_reminder',
        'new_review'
    ));

-- Ensure metadata column exists (JSONB for storing extra data like requiresReview, mentorId, etc.)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT NULL;
    END IF;
END $$;

-- Verify
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass AND contype = 'c';
