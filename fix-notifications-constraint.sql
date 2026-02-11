-- =============================================
--  Fix Notifications Type Constraint
--  Run this in your Supabase SQL Editor
--  This adds missing notification types
-- =============================================

-- Drop the old CHECK constraint on type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new CHECK constraint with ALL notification types including session_completed, session_cancelled, session_reminder
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
        'session_reminder'
    ));

-- Ensure realtime is enabled for notifications table
-- This is required for real-time subscriptions to work
-- Note: This may error if already added - that's OK
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'notifications table already in supabase_realtime publication';
END $$;

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass AND contype = 'c';
