-- Add gender column to user_profiles table

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Create index for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON user_profiles(gender);

-- Note: Run this SQL in your Supabase SQL Editor to add the gender field
-- This allows users to select their gender during signup and edit it in settings
