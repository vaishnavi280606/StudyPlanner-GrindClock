-- =============================================
-- FIX SCRIPT: Add missing columns to existing tables
-- Run this if you get "column does not exist" errors
-- =============================================

-- Add is_active column to mentorship_offerings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mentorship_offerings' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE mentorship_offerings 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add is_active column to mentor_availability if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mentor_availability' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE mentor_availability 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('mentorship_offerings', 'mentor_availability')
AND column_name = 'is_active';
