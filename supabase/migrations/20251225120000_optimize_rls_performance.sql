-- Optimize RLS policies for better performance
-- Fixes:
-- 1. Auth RLS initialization plan issues (wrap auth.uid() in SELECT)
-- 2. Multiple permissive policies on interaction_summaries

-- ==========================================
-- FIX 1: interaction_summaries table
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read interaction summaries for their content" ON public.interaction_summaries;
DROP POLICY IF EXISTS "Service role can manage interaction summaries" ON public.interaction_summaries;

-- Create optimized combined SELECT policy
-- Combines both user and service role access into one policy to avoid multiple permissive policies
CREATE POLICY "Users and service can read interaction summaries"
ON public.interaction_summaries FOR SELECT
USING (
  -- Allow service role full access
  (select auth.role()) = 'service_role'  -- Optimized with SELECT wrapper
  OR
  -- Allow users to read their own content
  EXISTS (
    SELECT 1 FROM public.content_bubbles cb
    JOIN public.milestones m ON cb.milestone_id = m.id
    JOIN public.learning_paths lp ON m.learning_path_id = lp.id
    WHERE cb.id = interaction_summaries.content_bubble_id
    AND lp.user_id = (select auth.uid())  -- Optimized with SELECT wrapper
  )
);

-- Create separate policies for INSERT/UPDATE/DELETE (service role only)
CREATE POLICY "Service role can insert interaction summaries"
ON public.interaction_summaries FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update interaction summaries"
ON public.interaction_summaries FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete interaction summaries"
ON public.interaction_summaries FOR DELETE
TO service_role
USING (true);

-- ==========================================
-- FIX 2: feedback table
-- ==========================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;

-- Recreate with optimized auth check
CREATE POLICY "Users can insert their own feedback"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);  -- Optimized with SELECT wrapper

-- Note: "Service role can read all feedback" policy is fine as-is
-- It doesn't use auth functions that need optimization
