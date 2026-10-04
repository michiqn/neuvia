-- Enhance milestone tracking with status and custom request support
-- This migration enables adaptive milestone progression

-- Add milestone_status column (locked, active, completed)
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS milestone_status TEXT NOT NULL DEFAULT 'locked'
CHECK (milestone_status IN ('locked', 'active', 'completed'));

-- Track when milestone was started
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Track when milestone was completed
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Flag custom-requested milestones
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS is_custom_request BOOLEAN NOT NULL DEFAULT false;

-- Store the custom topic request (if applicable)
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS custom_topic_request TEXT;

-- Update existing milestones: set first milestone of each path as 'active', rest as 'locked'
DO $$
BEGIN
  -- Only run if milestone_status column was just added (has all NULL/default values)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'milestones' AND column_name = 'is_completed') THEN

    -- Update from old is_completed to new milestone_status
    UPDATE public.milestones
    SET milestone_status = CASE
      WHEN is_completed = true THEN 'completed'
      WHEN order_index = 0 THEN 'active'
      ELSE 'locked'
    END;

    -- Drop old column
    ALTER TABLE public.milestones DROP COLUMN IF EXISTS is_completed;
  ELSE
    -- For new installs or if column doesn't exist, just set first milestone active
    WITH first_milestones AS (
      SELECT DISTINCT ON (learning_path_id) id
      FROM public.milestones
      ORDER BY learning_path_id, order_index ASC
    )
    UPDATE public.milestones
    SET milestone_status = CASE
      WHEN id IN (SELECT id FROM first_milestones) THEN 'active'
      ELSE 'locked'
    END
    WHERE milestone_status = 'locked'; -- Only update if not already set
  END IF;
END $$;
