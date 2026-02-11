-- =============================================
--  ███     Grind Clock Database Schema
--  ███     Run these commands in your Supabase SQL editor
--  ███
-- =============================================

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    study_preferences JSONB DEFAULT '{
        "defaultSessionDuration": 25,
        "reminderEnabled": true,
        "reminderTime": "09:00",
        "darkMode": false,
        "focusMode": false
    }',
    academic_info JSONB DEFAULT '{}',
    role TEXT CHECK (role IN ('student', 'mentor')),
    profession TEXT,
    experience TEXT,
    class TEXT,
    course TEXT,
    age INTEGER,
    phone_number TEXT,
    username TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#f59e0b',
    difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    target_hours_per_week DECIMAL(4,2) DEFAULT 0,
    target_hours_per_day DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 5),
    notes TEXT DEFAULT '',
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Goals Table
CREATE TABLE IF NOT EXISTS study_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    subject_ids UUID[] DEFAULT '{}',
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_exam BOOLEAN DEFAULT false,
    exam_date TIMESTAMP WITH TIME ZONE,
    exam_time TEXT,
    exam_location TEXT,
    study_hours_target DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule Slots Table (for future use)
CREATE TABLE IF NOT EXISTS schedule_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Subjects Policies
CREATE POLICY "Users can view own subjects" ON subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON subjects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON subjects
    FOR DELETE USING (auth.uid() = user_id);

-- Study Sessions Policies
CREATE POLICY "Users can view own sessions" ON study_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON study_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON study_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Study Goals Policies
CREATE POLICY "Users can view own goals" ON study_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON study_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON study_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON study_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Schedule Slots Policies
CREATE POLICY "Users can view own schedule" ON schedule_slots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" ON schedule_slots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" ON schedule_slots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule" ON schedule_slots
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_user_id ON schedule_slots(user_id);

-- Functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id, 
        full_name, 
        role, 
        profession, 
        experience, 
        class, 
        course, 
        age, 
        phone_number, 
        username,
        gender
    )
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'profession',
        NEW.raw_user_meta_data->>'experience',
        NEW.raw_user_meta_data->>'class',
        NEW.raw_user_meta_data->>'course',
        (NEW.raw_user_meta_data->>'age')::INTEGER,
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'gender'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_goals_updated_at BEFORE UPDATE ON study_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mentors Table
CREATE TABLE IF NOT EXISTS mentors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    expertise TEXT[] DEFAULT '{}',
    rating DECIMAL(3,2) DEFAULT 0,
    avatar_url TEXT,
    bio TEXT,
    availability TEXT,
    price_per_hour DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friends Table (User Relationships)
DROP TABLE IF EXISTS friends;
CREATE TABLE friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    friend_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_id)
);

-- Mentor Sessions Table
CREATE TABLE IF NOT EXISTS mentor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;

-- Mentors Policies (Publicly viewable)
CREATE POLICY "Anyone can view mentors" ON mentors
    FOR SELECT USING (true);

-- Friends Policies
CREATE POLICY "Users can view own friends" ON friends
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests" ON friends
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend request status" ON friends
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete friend requests" ON friends
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Mentor Sessions Policies
CREATE POLICY "Users can view own mentor sessions" ON mentor_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can book mentor sessions" ON mentor_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages Table (Chat History)
DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Enable RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages Policies
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Notifications Table
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'message', 'call')),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- Allow system/users to create notifications for others

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- Update Messages Table for Groups
ALTER TABLE messages ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Enable RLS for Groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Groups Policies
CREATE POLICY "Users can view groups they are members of" ON groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = groups.id 
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update groups" ON groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = groups.id 
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- Group Members Policies
CREATE POLICY "Members can view other members" ON group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can add members" ON group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
        OR 
        (user_id = auth.uid()) 
    );

-- Update Messages Policies for Groups
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own or group messages" ON messages
    FOR SELECT USING (
        (auth.uid() = sender_id) OR 
        (receiver_id = auth.uid()) OR
        (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_members.group_id = messages.group_id 
            AND group_members.user_id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        (auth.uid() = sender_id) AND (
            (receiver_id IS NOT NULL) OR
            (group_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM group_members 
                WHERE group_members.group_id = messages.group_id 
                AND group_members.user_id = auth.uid()
            ))
        )
    );
```