-- Migration to handle existing learning paths and milestones
-- Sets placeholder curriculum and marks first milestones as active

-- For existing learning paths without curriculum
-- Set a placeholder curriculum message
UPDATE public.learning_paths
SET curriculum = 'This learning path was created before the adaptive milestone system was implemented. Your milestones have been preserved, and you can continue your learning journey. Future milestones will be generated adaptively based on your progress.'
WHERE curriculum IS NULL;

-- Mark first milestone of each learning path as active, rest as locked
-- Only update milestones that don't have a status set yet
WITH first_milestones AS (
  SELECT DISTINCT ON (learning_path_id) id, learning_path_id
  FROM public.milestones
  ORDER BY learning_path_id, order_index ASC
)
UPDATE public.milestones
SET milestone_status = CASE
  WHEN id IN (SELECT id FROM first_milestones) THEN 'active'
  ELSE 'locked'
END,
started_at = CASE
  WHEN id IN (SELECT id FROM first_milestones) THEN now()
  ELSE NULL
END
WHERE milestone_status = 'locked'; -- Only update if not already set to active or completed
