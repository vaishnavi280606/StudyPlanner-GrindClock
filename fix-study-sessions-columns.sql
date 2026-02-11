-- =============================================
-- Fix Missing Columns in study_sessions Table
-- Run this in your Supabase SQL Editor
-- =============================================

-- Add 'notes' column if it doesn't exist
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Add 'completed' column if it doesn't exist  
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- Add 'focus_rating' column if it doesn't exist
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 5);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'study_sessions'
ORDER BY ordinal_position;
