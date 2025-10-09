-- Add UI enhancement features to existing schema
-- This migration extends the current database with new features for the enhanced UI

-- Add profile settings columns to app_users if they don't exist
DO $$ 
BEGIN
    -- Add profile settings columns to app_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'preferred_name') THEN
        ALTER TABLE app_users ADD COLUMN preferred_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'birth_date') THEN
        ALTER TABLE app_users ADD COLUMN birth_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'age') THEN
        ALTER TABLE app_users ADD COLUMN age INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'health_notes') THEN
        ALTER TABLE app_users ADD COLUMN health_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'emergency_contact') THEN
        ALTER TABLE app_users ADD COLUMN emergency_contact TEXT;
    END IF;
END $$;

-- Add celebration and gamification columns to session_progress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_progress' AND column_name = 'celebration_emoji') THEN
        ALTER TABLE session_progress ADD COLUMN celebration_emoji TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_progress' AND column_name = 'points_earned') THEN
        ALTER TABLE session_progress ADD COLUMN points_earned INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_progress' AND column_name = 'completed_at') THEN
        ALTER TABLE session_progress ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create types for new features
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_tone') THEN
        CREATE TYPE notification_tone AS ENUM ('success', 'warning', 'error', 'info');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_author_type') THEN
        CREATE TYPE message_author_type AS ENUM ('coach', 'client');
    END IF;
END $$;

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    author_type message_author_type NOT NULL,
    author_id UUID NOT NULL REFERENCES app_users(id),
    message_body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    tone notification_tone DEFAULT 'info',
    read_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create check-ins table
CREATE TABLE IF NOT EXISTS user_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    week_index INTEGER NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
    weight_kg DECIMAL(5,2),
    notes TEXT,
    attachments TEXT[] DEFAULT '{}'
);

-- Create progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    image_url TEXT NOT NULL,
    content_type TEXT,
    size_bytes BIGINT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_check_ins_user_week ON user_check_ins(user_id, week_index);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user ON progress_photos(user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_progress_user_week ON session_progress(user_id, week_index);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can manage own chat messages" ON chat_messages
    FOR ALL USING (user_id = auth.uid() OR author_id = auth.uid());

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can manage own check-ins" ON user_check_ins
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own photos" ON progress_photos
    FOR ALL USING (user_id = auth.uid());

-- Admin policies (users with is_admin = true can see all data)
CREATE POLICY "Admins can view all chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.is_admin = true)
    );

CREATE POLICY "Admins can view all notifications" ON notifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.is_admin = true)
    );

CREATE POLICY "Admins can view all check-ins" ON user_check_ins
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.is_admin = true)
    );

CREATE POLICY "Admins can view all photos" ON progress_photos
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.is_admin = true)
    );

-- Functions for enhanced features
CREATE OR REPLACE FUNCTION create_user_notification(
    user_id_param UUID,
    title_param TEXT,
    message_param TEXT,
    tone_param notification_tone DEFAULT 'info',
    action_url_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, tone, action_url)
    VALUES (user_id_param, title_param, message_param, tone_param, action_url_param)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Function to mark exercises complete with celebration
CREATE OR REPLACE FUNCTION mark_exercise_complete_with_celebration(
    user_id_param UUID,
    week_index_param INTEGER,
    session_id_param TEXT,
    exercise_id_param TEXT,
    completed_sets_param INTEGER,
    total_sets_param INTEGER,
    celebration_emoji_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    points_earned_calc INTEGER;
BEGIN
    -- Calculate points based on completion
    points_earned_calc := CASE 
        WHEN completed_sets_param >= total_sets_param THEN 100
        ELSE (completed_sets_param * 100 / total_sets_param)
    END;
    
    -- Update session progress
    INSERT INTO session_progress (user_id, week_index, session_id, exercise_id, completed_sets, total_sets, celebration_emoji, points_earned, completed_at)
    VALUES (user_id_param, week_index_param, session_id_param, exercise_id_param, completed_sets_param, total_sets_param, celebration_emoji_param, points_earned_calc, NOW())
    ON CONFLICT (user_id, week_index, session_id, exercise_id)
    DO UPDATE SET
        completed_sets = excluded.completed_sets,
        total_sets = excluded.total_sets,
        celebration_emoji = excluded.celebration_emoji,
        points_earned = excluded.points_earned,
        completed_at = excluded.completed_at,
        last_updated_at = NOW();
        
    -- Create a celebration notification if completed
    IF completed_sets_param >= total_sets_param AND celebration_emoji_param IS NOT NULL THEN
        PERFORM create_user_notification(
            user_id_param,
            'Exercise Completed! ' || celebration_emoji_param,
            'Great job completing ' || exercise_id_param || '!',
            'success'
        );
    END IF;
END;
$$;