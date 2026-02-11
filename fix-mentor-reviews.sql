-- =============================================
--  Fix Mentor Reviews System
--  Run this in your Supabase SQL Editor
--  This ensures the mentor_reviews table and rating updates work
-- =============================================

-- 1. Create mentor_reviews table if it doesn't exist
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

-- 2. Add rating and total_reviews columns to user_profiles if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'rating'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN rating DECIMAL(3,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'total_reviews'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_mentor_reviews_mentor ON mentor_reviews(mentor_id);

-- 4. Enable RLS on mentor_reviews
ALTER TABLE mentor_reviews ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view reviews" ON mentor_reviews;
DROP POLICY IF EXISTS "Students can create reviews" ON mentor_reviews;
DROP POLICY IF EXISTS "Students can update their reviews" ON mentor_reviews;

-- 6. Create RLS policies for mentor_reviews
CREATE POLICY "Anyone can view reviews" ON mentor_reviews
    FOR SELECT USING (true);

CREATE POLICY "Students can create reviews" ON mentor_reviews
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their reviews" ON mentor_reviews
    FOR UPDATE USING (auth.uid() = student_id);

-- 7. Create function to update mentor rating (or replace if exists)
CREATE OR REPLACE FUNCTION update_mentor_rating()
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

-- 8. Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_mentor_rating_after_review ON mentor_reviews;

-- 9. Create trigger to auto-update mentor rating when review is added/updated
CREATE TRIGGER update_mentor_rating_after_review
    AFTER INSERT OR UPDATE ON mentor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_rating();

-- 10. Enable realtime for mentor_reviews
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE mentor_reviews;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'mentor_reviews table already in supabase_realtime publication';
END $$;

-- 11. Verify setup
SELECT 'mentor_reviews table exists' AS status, 
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mentor_reviews') AS count;
       
SELECT 'user_profiles has rating column' AS status,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'rating') AS exists;

SELECT 'trigger exists' AS status,
       EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'update_mentor_rating_after_review') AS exists;
