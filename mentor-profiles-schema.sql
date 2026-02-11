-- Enhanced Mentor Profile Schema

-- Add mentor-specific fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS domain TEXT[], -- e.g., ['Web Dev', 'DSA', 'AI/ML']
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS college TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[], -- Skills/tags
ADD COLUMN IF NOT EXISTS languages TEXT[], -- Languages known
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Table for mentorship offerings
CREATE TABLE IF NOT EXISTS mentorship_offerings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- e.g., '1:1 Mentorship', 'Doubt Solving', 'Resume Review'
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    mode TEXT CHECK (mode IN ('chat', 'call', 'video')) DEFAULT 'video',
    is_free BOOLEAN DEFAULT true,
    price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for session requests (replaces mentor_sessions for requests)
CREATE TABLE IF NOT EXISTS session_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES mentorship_offerings(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    student_message TEXT,
    preferred_date DATE,
    preferred_time TIME,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
    mentor_response TEXT,
    meeting_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for mentor reviews
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_domain ON user_profiles USING GIN(domain);
CREATE INDEX IF NOT EXISTS idx_mentorship_offerings_mentor ON mentorship_offerings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor ON session_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_student ON session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status);
CREATE INDEX IF NOT EXISTS idx_mentor_reviews_mentor ON mentor_reviews(mentor_id);

-- Enable RLS
ALTER TABLE mentorship_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active offerings" ON mentorship_offerings;
DROP POLICY IF EXISTS "Mentors can manage their offerings" ON mentorship_offerings;
DROP POLICY IF EXISTS "Users can view their own requests" ON session_requests;
DROP POLICY IF EXISTS "Students can create requests" ON session_requests;
DROP POLICY IF EXISTS "Mentors and students can update their requests" ON session_requests;
DROP POLICY IF EXISTS "Anyone can view reviews" ON mentor_reviews;
DROP POLICY IF EXISTS "Students can create reviews" ON mentor_reviews;
DROP POLICY IF EXISTS "Students can update their reviews" ON mentor_reviews;

-- Policies for mentorship_offerings
CREATE POLICY "Anyone can view active offerings" ON mentorship_offerings
    FOR SELECT USING (is_active = true);

CREATE POLICY "Mentors can manage their offerings" ON mentorship_offerings
    FOR ALL USING (auth.uid() = mentor_id);

-- Policies for session_requests
CREATE POLICY "Users can view their own requests" ON session_requests
    FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = student_id);

CREATE POLICY "Students can create requests" ON session_requests
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mentors and students can update their requests" ON session_requests
    FOR UPDATE USING (auth.uid() = mentor_id OR auth.uid() = student_id);

-- Policies for mentor_reviews
CREATE POLICY "Anyone can view reviews" ON mentor_reviews
    FOR SELECT USING (true);

CREATE POLICY "Students can create reviews" ON mentor_reviews
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their reviews" ON mentor_reviews
    FOR UPDATE USING (auth.uid() = student_id);

-- Function to update mentor rating
CREATE OR REPLACE FUNCTION update_mentor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles
    SET 
        rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM mentor_reviews WHERE mentor_id = NEW.mentor_id),
        total_reviews = (SELECT COUNT(*) FROM mentor_reviews WHERE mentor_id = NEW.mentor_id)
    WHERE user_id = NEW.mentor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_mentor_rating_after_review ON mentor_reviews;

-- Trigger to update mentor rating
CREATE TRIGGER update_mentor_rating_after_review
    AFTER INSERT OR UPDATE ON mentor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_rating();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if exist
DROP TRIGGER IF EXISTS set_mentorship_offerings_updated_at ON mentorship_offerings;
DROP TRIGGER IF EXISTS set_session_requests_updated_at ON session_requests;

-- Triggers for updated_at
CREATE TRIGGER set_mentorship_offerings_updated_at
    BEFORE UPDATE ON mentorship_offerings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_session_requests_updated_at
    BEFORE UPDATE ON session_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
