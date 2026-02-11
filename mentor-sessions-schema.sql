-- Mentor Sessions and Booking System Schema

-- Table for mentor sessions/bookings
CREATE TABLE IF NOT EXISTS mentor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
    meeting_link TEXT,
    notes TEXT,
    student_notes TEXT,
    mentor_feedback TEXT,
    student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for mentor availability
CREATE TABLE IF NOT EXISTS mentor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentor_id, day_of_week, start_time)
);

-- Table for tracking mentor-student relationships
CREATE TABLE IF NOT EXISTS mentor_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subjects TEXT[] DEFAULT '{}',
    total_sessions INTEGER DEFAULT 0,
    last_session_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentor_id, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_student ON mentor_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_status ON mentor_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_scheduled_time ON mentor_sessions(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_mentor_availability_mentor ON mentor_availability(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_mentor ON mentor_students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_student ON mentor_students(student_id);

-- Enable Row Level Security
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_students ENABLE ROW LEVEL SECURITY;

-- Policies for mentor_sessions
CREATE POLICY "Users can view their own sessions" ON mentor_sessions
    FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = student_id);

CREATE POLICY "Students can create booking requests" ON mentor_sessions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mentors and students can update their sessions" ON mentor_sessions
    FOR UPDATE USING (auth.uid() = mentor_id OR auth.uid() = student_id);

CREATE POLICY "Users can delete their own sessions" ON mentor_sessions
    FOR DELETE USING (auth.uid() = mentor_id OR auth.uid() = student_id);

-- Policies for mentor_availability
CREATE POLICY "Anyone can view mentor availability" ON mentor_availability
    FOR SELECT USING (true);

CREATE POLICY "Mentors can manage their availability" ON mentor_availability
    FOR ALL USING (auth.uid() = mentor_id);

-- Policies for mentor_students
CREATE POLICY "Users can view their relationships" ON mentor_students
    FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = student_id);

CREATE POLICY "System can manage relationships" ON mentor_students
    FOR ALL USING (auth.uid() = mentor_id OR auth.uid() = student_id);

-- Function to auto-update mentor_students when session is completed
CREATE OR REPLACE FUNCTION update_mentor_student_relationship()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO mentor_students (mentor_id, student_id, subjects, total_sessions, last_session_at)
        VALUES (NEW.mentor_id, NEW.student_id, ARRAY[NEW.subject], 1, NEW.scheduled_time)
        ON CONFLICT (mentor_id, student_id) 
        DO UPDATE SET
            subjects = CASE 
                WHEN NEW.subject = ANY(mentor_students.subjects) THEN mentor_students.subjects
                ELSE array_append(mentor_students.subjects, NEW.subject)
            END,
            total_sessions = mentor_students.total_sessions + 1,
            last_session_at = NEW.scheduled_time;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update mentor_students
CREATE TRIGGER update_mentor_student_after_session
    AFTER UPDATE ON mentor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_student_relationship();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mentor_sessions updated_at
CREATE TRIGGER set_mentor_sessions_updated_at
    BEFORE UPDATE ON mentor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
