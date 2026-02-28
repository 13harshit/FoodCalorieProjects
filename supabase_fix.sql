-- ============================================
-- NutriVision - Fix RLS + Add Session Tracking
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own history" ON food_analysis_history;
DROP POLICY IF EXISTS "Users can insert own history" ON food_analysis_history;
DROP POLICY IF EXISTS "Users can delete own history" ON food_analysis_history;
DROP POLICY IF EXISTS "Admin can view all history" ON food_analysis_history;

-- Step 2: Add missing columns to food_analysis_history
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='food_analysis_history' AND column_name='type') THEN
        ALTER TABLE food_analysis_history ADD COLUMN type TEXT DEFAULT 'image_analysis';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='food_analysis_history' AND column_name='search_query') THEN
        ALTER TABLE food_analysis_history ADD COLUMN search_query TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='food_analysis_history' AND column_name='original_image') THEN
        ALTER TABLE food_analysis_history ADD COLUMN original_image TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='food_analysis_history' AND column_name='annotated_image') THEN
        ALTER TABLE food_analysis_history ADD COLUMN annotated_image TEXT;
    END IF;
END $$;

-- Step 3: Create user_sessions table for activity tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INT DEFAULT 0,
    pages_visited INT DEFAULT 1
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Step 4: Admin utility function (SECURITY DEFINER to bypass RLS recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Step 5: Profiles RLS policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Admin can see ALL profiles (uses is_admin() function to avoid recursion)
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admin can edit ALL profiles
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Step 6: food_analysis_history RLS policies
CREATE POLICY "Users can view own history"
  ON food_analysis_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON food_analysis_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON food_analysis_history FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all history"
  ON food_analysis_history FOR SELECT
  USING (is_admin());

-- Step 6: user_sessions RLS policies
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admin can view all sessions" ON user_sessions;

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all sessions"
  ON user_sessions FOR SELECT
  USING (is_admin());

-- Step 7: Indexes
CREATE INDEX IF NOT EXISTS idx_food_history_user_id ON food_analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_food_history_created_at ON food_analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_history_type ON food_analysis_history(type);
CREATE INDEX IF NOT EXISTS idx_sessions_login_at ON user_sessions(login_at DESC);

-- Step 8: Create contact_messages table for Contact Us page submissions
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'unread'
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (even not logged in) can insert a message
CREATE POLICY "Public can insert contact messages"
  ON contact_messages FOR INSERT WITH CHECK (true);

-- Only admins can view messages
CREATE POLICY "Admin can view all messages"
  ON contact_messages FOR SELECT
  USING (is_admin());

-- Only admins can update messages (e.g. marking as read)
CREATE POLICY "Admin can update messages"
  ON contact_messages FOR UPDATE
  USING (is_admin());

-- Only admins can delete messages
CREATE POLICY "Admin can delete messages"
  ON contact_messages FOR DELETE
  USING (is_admin());
