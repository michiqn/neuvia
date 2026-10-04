-- Add curriculum context fields to learning_paths table
-- This migration adds support for adaptive milestone generation

-- Store overall curriculum outline (visible to student)
ALTER TABLE public.learning_paths
ADD COLUMN IF NOT EXISTS curriculum TEXT;

-- Track which milestone we're on
ALTER TABLE public.learning_paths
ADD COLUMN IF NOT EXISTS current_milestone_index INTEGER NOT NULL DEFAULT 0;

-- Store AI context for adaptive generation (JSON)
ALTER TABLE public.learning_paths
ADD COLUMN IF NOT EXISTS progression_context JSONB DEFAULT '{}'::jsonb;
