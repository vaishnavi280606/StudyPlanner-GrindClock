-- =============================================
--  Enhanced Database Schema for FAANG-Level Features
--  Mentor-Student Matching, Analytics, Trust & Safety
-- =============================================

-- ============================================
-- PART 1: MENTOR PROFILES & OFFERINGS
-- ============================================

-- Extended Mentor Profiles Table
CREATE TABLE IF NOT EXISTS mentor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Professional Info
    domain TEXT[] DEFAULT '{}', -- e.g., ['Web Dev', 'DSA', 'AI/ML']
    expertise_level TEXT CHECK (expertise_level IN ('beginner', 'intermediate', 'expert')) DEFAULT 'intermediate',
    experience_years INTEGER DEFAULT 0,
    company TEXT,
    college TEXT,
    bio TEXT,
    skills TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    
    -- Verification & Status
    is_verified BOOLEAN DEFAULT false,
    verification_requested_at TIMESTAMP WITH TIME ZONE,
    verification_documents JSONB DEFAULT '[]',
    status TEXT CHECK (status IN ('available', 'in_session', 'offline')) DEFAULT 'offline',
    
    -- Ratings & Stats
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    response_time_minutes INTEGER DEFAULT 0, -- Average response time
    
    -- Availability
    available_days TEXT[] DEFAULT '{}', -- ['Monday', 'Tuesday', ...]
    timezone TEXT DEFAULT 'UTC',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Mentorship Offerings Table
CREATE TABLE IF NOT EXISTS mentorship_offerings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID REFERENCES mentor_profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    title TEXT NOT NULL, -- '1:1 Mentorship', 'Doubt Solving', 'Resume Review', etc.
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    mode TEXT CHECK (mode IN ('chat', 'call', 'video')) DEFAULT 'chat',
    
    -- Pricing (for future)
    is_free BOOLEAN DEFAULT true,
    price DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentor Availability Slots
CREATE TABLE IF NOT EXISTS mentor_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID REFERENCES mentor_profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL, -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 2: REVIEWS & ANALYTICS
-- ============================================

-- Session Reviews Table
CREATE TABLE IF NOT EXISTS session_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES session_requests(id) ON DELETE CASCADE UNIQUE NOT NULL,
    mentor_id UUID REFERENCES mentor_profiles(user_id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Rating Details
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review_text TEXT,
    
    -- Rating Categories (optional detailed feedback)
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    knowledge_rating INTEGER CHECK (knowledge_rating >= 1 AND knowledge_rating <= 5),
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentor Analytics Table
CREATE TABLE IF NOT EXISTS mentor_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID REFERENCES mentor_profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    sessions_completed INTEGER DEFAULT 0,
    sessions_cancelled INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_hours DECIMAL(10,2) DEFAULT 0.00,
    response_time_minutes INTEGER DEFAULT 0,
    student_satisfaction_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    repeat_students INTEGER DEFAULT 0,
    
    -- Revenue (if paid)
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentor_id, period_start, period_end)
);

-- ============================================
-- PART 3: MATCHING SYSTEM
-- ============================================

-- Matching Scores Cache
CREATE TABLE IF NOT EXISTS matching_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    mentor_id UUID REFERENCES mentor_profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Score Breakdown
    total_score DECIMAL(5,2) NOT NULL,
    skill_match_score DECIMAL(5,2) DEFAULT 0.00,
    availability_score DECIMAL(5,2) DEFAULT 0.00,
    rating_score DECIMAL(5,2) DEFAULT 0.00,
    past_success_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Matching Criteria Used
    criteria JSONB,
    
    -- Cache Management
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    
    UNIQUE(student_id, mentor_id)
);

-- Update session_requests to include matching score
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS matching_score DECIMAL(5,2);

-- ============================================
-- PART 4: TRUST & SAFETY
-- ============================================

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    reported_user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Report Details
    category TEXT CHECK (category IN ('harassment', 'spam', 'inappropriate_content', 'fake_profile', 'other')) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    
    -- Status
    status TEXT CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'pending',
    
    -- Admin Response
    reviewed_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    admin_notes TEXT,
    resolution TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Actions Log
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    target_user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    action_type TEXT CHECK (action_type IN ('suspend', 'unsuspend', 'ban', 'unban', 'warn', 'verify_mentor')) NOT NULL,
    reason TEXT NOT NULL,
    duration_days INTEGER, -- For temporary suspensions
    
    related_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Suspensions Table
CREATE TABLE IF NOT EXISTS user_suspensions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    is_suspended BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_until TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    
    banned_at TIMESTAMP WITH TIME ZONE,
    ban_reason TEXT,
    
    total_reports INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 5: INDEXES FOR PERFORMANCE
-- ============================================

-- Mentor Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_user_id ON mentor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_status ON mentor_profiles(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_rating ON mentor_profiles(rating DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_verified ON mentor_profiles(is_verified) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_domain ON mentor_profiles USING GIN(domain);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_skills ON mentor_profiles USING GIN(skills);

-- Mentorship Offerings Indexes
CREATE INDEX IF NOT EXISTS idx_offerings_mentor_id ON mentorship_offerings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_offerings_active ON mentorship_offerings(is_active);

-- Availability Indexes
CREATE INDEX IF NOT EXISTS idx_availability_mentor_id ON mentor_availability(mentor_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON mentor_availability(day_of_week);

-- Reviews Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_mentor_id ON session_reviews(mentor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON session_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON session_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON session_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON session_reviews(created_at DESC);

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_mentor_id ON mentor_analytics(mentor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_period ON mentor_analytics(period_start, period_end);

-- Matching Scores Indexes
CREATE INDEX IF NOT EXISTS idx_matching_student_id ON matching_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_matching_mentor_id ON matching_scores(mentor_id);
CREATE INDEX IF NOT EXISTS idx_matching_score ON matching_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_matching_expires ON matching_scores(expires_at);

-- Session Requests Index (for matching score)
CREATE INDEX IF NOT EXISTS idx_session_requests_matching_score ON session_requests(matching_score DESC);

-- Reports Indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Admin Actions Indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- Suspensions Index
CREATE INDEX IF NOT EXISTS idx_suspensions_user_id ON user_suspensions(user_id);

-- ============================================
-- PART 6: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- Mentor Profiles Policies
CREATE POLICY "Public can view active mentor profiles" ON mentor_profiles
    FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Mentors can update own profile" ON mentor_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Mentors can insert own profile" ON mentor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mentorship Offerings Policies
CREATE POLICY "Public can view active offerings" ON mentorship_offerings
    FOR SELECT USING (is_active = true);

CREATE POLICY "Mentors can manage own offerings" ON mentorship_offerings
    FOR ALL USING (
        auth.uid() = mentor_id OR
        auth.uid() IN (SELECT user_id FROM mentor_profiles WHERE user_id = mentor_id)
    );

-- Availability Policies
CREATE POLICY "Public can view mentor availability" ON mentor_availability
    FOR SELECT USING (is_active = true);

CREATE POLICY "Mentors can manage own availability" ON mentor_availability
    FOR ALL USING (auth.uid() = mentor_id);

-- Reviews Policies
CREATE POLICY "Public can view reviews" ON session_reviews
    FOR SELECT USING (true);

CREATE POLICY "Students can create reviews for their sessions" ON session_reviews
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own reviews" ON session_reviews
    FOR UPDATE USING (auth.uid() = student_id);

-- Analytics Policies
CREATE POLICY "Mentors can view own analytics" ON mentor_analytics
    FOR SELECT USING (auth.uid() = mentor_id);

-- Matching Scores Policies
CREATE POLICY "Students can view own matching scores" ON matching_scores
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "System can manage matching scores" ON matching_scores
    FOR ALL USING (true); -- Allow system to calculate and cache scores

-- Reports Policies
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin Actions Policies
CREATE POLICY "Admins can manage admin actions" ON admin_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Suspensions Policies
CREATE POLICY "Users can view own suspension status" ON user_suspensions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage suspensions" ON user_suspensions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- PART 7: TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update mentor rating when review is added
CREATE OR REPLACE FUNCTION update_mentor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE mentor_profiles
    SET 
        rating = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM session_reviews
            WHERE mentor_id = NEW.mentor_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM session_reviews
            WHERE mentor_id = NEW.mentor_id
        ),
        updated_at = NOW()
    WHERE user_id = NEW.mentor_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for rating updates
DROP TRIGGER IF EXISTS trigger_update_mentor_rating ON session_reviews;
CREATE TRIGGER trigger_update_mentor_rating
    AFTER INSERT OR UPDATE ON session_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_rating();

-- Function to auto-suspend users with too many reports
CREATE OR REPLACE FUNCTION check_auto_suspend()
RETURNS TRIGGER AS $$
DECLARE
    report_count INTEGER;
BEGIN
    -- Count total reports for this user
    SELECT COUNT(*) INTO report_count
    FROM reports
    WHERE reported_user_id = NEW.reported_user_id
    AND status != 'dismissed';
    
    -- Update suspension table
    INSERT INTO user_suspensions (user_id, total_reports)
    VALUES (NEW.reported_user_id, report_count)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_reports = report_count,
        updated_at = NOW();
    
    -- Auto-suspend if 5 or more reports
    IF report_count >= 5 THEN
        UPDATE user_suspensions
        SET 
            is_suspended = true,
            suspended_at = NOW(),
            suspended_until = NOW() + INTERVAL '7 days',
            suspension_reason = 'Automatic suspension due to multiple reports',
            updated_at = NOW()
        WHERE user_id = NEW.reported_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-suspension
DROP TRIGGER IF EXISTS trigger_check_auto_suspend ON reports;
CREATE TRIGGER trigger_check_auto_suspend
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION check_auto_suspend();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_mentor_profiles_timestamp BEFORE UPDATE ON mentor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_offerings_timestamp BEFORE UPDATE ON mentorship_offerings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_reviews_timestamp BEFORE UPDATE ON session_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_analytics_timestamp BEFORE UPDATE ON mentor_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_reports_timestamp BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_suspensions_timestamp BEFORE UPDATE ON user_suspensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- ============================================
-- PART 8: INITIAL DATA & CLEANUP
-- ============================================

-- Clean up expired matching scores (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_matching_scores()
RETURNS void AS $$
BEGIN
    DELETE FROM matching_scores
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin role to user_profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
            CHECK (role IN ('student', 'mentor', 'admin'));
    END IF;
END $$;

-- Add gender column if not exists (from previous schema)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT;

-- =============================================
-- SCHEMA ENHANCEMENT COMPLETE
-- =============================================
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify all tables are created
-- 3. Test RLS policies with different user roles
-- 4. Implement matching algorithm in TypeScript
-- =============================================
