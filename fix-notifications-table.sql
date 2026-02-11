-- Fix notifications table to support all types and nullable content
ALTER TABLE notifications
    ALTER COLUMN content DROP NOT NULL;

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check CHECK (type IN (
        'friend_request', 'message', 'call', 'call_ended', 'group_added', 'session_request', 'session_accepted', 'session_completed', 'session_cancelled', 'session_reminder'
    ));
