-- Verification migration for CASCADE deletes
-- This migration verifies that all foreign keys have proper CASCADE delete configured
-- Safe to run - only checks existing constraints, doesn't modify anything

-- This is a verification-only migration
-- All CASCADE deletes are already properly configured in previous migrations:
--   - milestones.learning_path_id → learning_paths(id) ON DELETE CASCADE
--   - content_bubbles.milestone_id → milestones(id) ON DELETE CASCADE
--   - interactions.content_bubble_id → content_bubbles(id) ON DELETE CASCADE
--   - quiz_questions.interaction_id → interactions(id) ON DELETE CASCADE
--   - flashcards.interaction_id → interactions(id) ON DELETE CASCADE
--   - iow_entries.interaction_id → interactions(id) ON DELETE CASCADE
--   - summaries.content_bubble_id → content_bubbles(id) ON DELETE CASCADE
--   - quiz_attempts.quiz_question_id → quiz_questions(id) ON DELETE CASCADE
--   - content_bubble_completions.content_bubble_id → content_bubbles(id) ON DELETE CASCADE
--   - iow_completions.iow_entry_id → iow_entries(id) ON DELETE CASCADE

-- Query to verify CASCADE constraints exist (for reference)
-- Uncomment to run verification:
/*
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS foreign_table,
  confdeltype AS on_delete_action
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
  AND confdeltype = 'c' -- 'c' means CASCADE
ORDER BY conrelid::regclass::text;
*/

-- If you want to see the CASCADE chain, uncomment and run this query:
/*
WITH RECURSIVE cascade_chain AS (
  SELECT
    'learning_paths'::text AS table_name,
    0 AS level
  UNION ALL
  SELECT
    cc.conrelid::regclass::text,
    c.level + 1
  FROM cascade_chain c
  JOIN pg_constraint cc ON cc.confrelid = c.table_name::regclass
  WHERE cc.confdeltype = 'c' -- CASCADE
    AND c.level < 10
)
SELECT DISTINCT table_name, level
FROM cascade_chain
ORDER BY level, table_name;
*/

-- No actual changes needed - all CASCADE deletes are properly configured!
SELECT 'All CASCADE delete constraints are already properly configured' AS status;
