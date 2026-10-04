-- OPTIONAL: Remove unused indexes to reduce storage and maintenance overhead
-- Only run this if you're confident these indexes won't be needed
-- You can always recreate them later if query patterns change

-- Note: These indexes are currently unused but may become useful as your app grows
-- Consider keeping them if you plan to query by these columns in the future

-- Unused indexes on user_id columns (progress tracking tables)
-- DROP INDEX IF EXISTS public.idx_quiz_attempts_user_id;
-- DROP INDEX IF EXISTS public.idx_content_completions_user_id;
-- DROP INDEX IF EXISTS public.idx_iow_completions_user_id;

-- Unused feedback table indexes
-- DROP INDEX IF EXISTS public.feedback_user_id_idx;
-- DROP INDEX IF EXISTS public.feedback_created_at_idx;
-- DROP INDEX IF EXISTS public.feedback_type_idx;

-- Unused content_bubbles order index
-- DROP INDEX IF EXISTS public.content_bubbles_order_index_idx;

-- RECOMMENDATION: Keep these indexes for now since:
-- 1. Your app is in early development - usage patterns will evolve
-- 2. Feedback feature was just added (Dec 22) - indexes likely useful soon
-- 3. Progress tracking indexes will be needed when you add analytics/dashboards
-- 4. The storage overhead is minimal at this scale
-- 5. These are INFO level warnings, not critical performance issues

-- You can uncomment and run this migration later if these remain unused after 6+ months
