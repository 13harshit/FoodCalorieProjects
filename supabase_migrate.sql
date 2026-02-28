-- ============================================
-- NutriVision - Add missing columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Add new columns to existing table (safe: IF NOT EXISTS won't error if already there)
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

-- Create index on type column
CREATE INDEX IF NOT EXISTS idx_food_history_type ON food_analysis_history(type);
