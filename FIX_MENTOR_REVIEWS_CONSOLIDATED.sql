-- =============================================
--  CONSOLIDATED FIX: MENTOR REVIEWS & RATINGS
-- =============================================
-- Run this in your Supabase SQL Editor

-- 1. Ensure user_profiles has rating columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- 2. Create/Recreate mentor_reviews table with correct columns
-- We use session_id to be consistent with other schema files
CREATE TABLE IF NOT EXISTS mentor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES session_requests(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentor_id, student_id, session_id)
);

-- Handle case where session_request_id might exist instead of session_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mentor_reviews' AND column_name = 'session_request_id'
    ) THEN
        ALTER TABLE mentor_reviews RENAME COLUMN session_request_id TO session_id;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE mentor_reviews ENABLE ROW LEVEL SECURITY;

-- 4. Recreate Policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON mentor_reviews;
DROP POLICY IF EXISTS "Students can create reviews" ON mentor_reviews;
DROP POLICY IF EXISTS "Students can update their reviews" ON mentor_reviews;

CREATE POLICY "Anyone can view reviews" ON mentor_reviews FOR SELECT USING (true);
CREATE POLICY "Students can create reviews" ON mentor_reviews FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update their reviews" ON mentor_reviews FOR UPDATE USING (auth.uid() = student_id);

-- 5. Create function to update mentor rating in user_profiles
CREATE OR REPLACE FUNCTION update_mentor_rating_v2()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles
    SET 
        rating = (SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0) FROM mentor_reviews WHERE mentor_id = NEW.mentor_id),
        total_reviews = (SELECT COUNT(*) FROM mentor_reviews WHERE mentor_id = NEW.mentor_id)
    WHERE user_id = NEW.mentor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate Trigger
DROP TRIGGER IF EXISTS trigger_update_mentor_rating_v2 ON mentor_reviews;
CREATE TRIGGER trigger_update_mentor_rating_v2
    AFTER INSERT OR UPDATE ON mentor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_rating_v2();

-- 7. Enable Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE mentor_reviews;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

RAISE NOTICE '✅ Mentor reviews system successfully fixed!';
