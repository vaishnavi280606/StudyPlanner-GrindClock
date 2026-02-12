-- =============================================
-- Fix Friend Streaks: Add study_streak to user_profiles
-- This stores the streak directly on the profile so any user
-- can see any other user's streak without RLS issues.
-- Run this in your Supabase SQL Editor.
-- =============================================

-- 1) Add study_streak column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS study_streak INTEGER DEFAULT 0;

-- 2) Create a SECURITY DEFINER function to compute streak from study_sessions
CREATE OR REPLACE FUNCTION compute_user_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    study_dates DATE[];
    current_streak INTEGER := 0;
    check_date DATE;
BEGIN
    SELECT ARRAY_AGG(DISTINCT DATE(created_at) ORDER BY DATE(created_at) DESC)
    INTO study_dates
    FROM study_sessions
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '90 days';

    IF study_dates IS NULL OR array_length(study_dates, 1) IS NULL THEN
        RETURN 0;
    END IF;

    check_date := CURRENT_DATE;

    IF check_date = ANY(study_dates) THEN
        current_streak := 1;
        check_date := check_date - 1;
    ELSE
        check_date := check_date - 1;
        IF NOT (check_date = ANY(study_dates)) THEN
            RETURN 0;
        END IF;
        current_streak := 1;
        check_date := check_date - 1;
    END IF;

    WHILE check_date = ANY(study_dates) LOOP
        current_streak := current_streak + 1;
        check_date := check_date - 1;
    END LOOP;

    RETURN current_streak;
END;
$$;

-- 3) Create trigger function to auto-update streak when study_sessions change
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE user_profiles
        SET study_streak = compute_user_streak(OLD.user_id)
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    ELSE
        UPDATE user_profiles
        SET study_streak = compute_user_streak(NEW.user_id)
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    END IF;
END;
$$;

-- 4) Create trigger on study_sessions
DROP TRIGGER IF EXISTS on_study_session_streak_update ON study_sessions;
CREATE TRIGGER on_study_session_streak_update
    AFTER INSERT OR UPDATE OR DELETE ON study_sessions
    FOR EACH ROW EXECUTE FUNCTION update_user_streak();

-- 5) Backfill existing streaks for all users
UPDATE user_profiles
SET study_streak = compute_user_streak(user_id);

-- 6) Also ensure the friends visibility policy exists (needed for other features)
DROP POLICY IF EXISTS "Users can view own sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can view own and friends sessions" ON study_sessions;

CREATE POLICY "Users can view own and friends sessions" ON study_sessions
    FOR SELECT USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM friends
            WHERE status = 'accepted'
            AND (
                (user_id = auth.uid() AND friend_id = study_sessions.user_id)
                OR
                (friend_id = auth.uid() AND user_id = study_sessions.user_id)
            )
        )
    );

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'study_streak';
