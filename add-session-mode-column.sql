-- =====================================================
-- Add MODE column to existing session_requests table
-- =====================================================
-- Run this if session_requests table already exists
-- This adds the mode column to track session type (chat/call/video)

-- Add mode column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' AND column_name = 'mode'
    ) THEN
        ALTER TABLE session_requests 
        ADD COLUMN mode TEXT CHECK (mode IN ('chat', 'call', 'video')) DEFAULT 'video';
        
        RAISE NOTICE '✅ Mode column added to session_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ Mode column already exists in session_requests table';
    END IF;
    
    -- Update existing records to have default mode
    UPDATE session_requests 
    SET mode = 'video' 
    WHERE mode IS NULL;
    
    RAISE NOTICE '✅ Session mode feature enabled!';
    RAISE NOTICE 'Mentors can now set session mode as chat, call, or video';
    RAISE NOTICE 'Students can only chat - mentors initiate calls';
END $$;
