-- Simplified RLS policies for summaries table
-- Use a more direct approach that works with Supabase client

-- First drop all existing policies
DROP POLICY IF EXISTS "Users can manage summaries of their learning paths" ON public.summaries;
DROP POLICY IF EXISTS "Users can view summaries of their learning paths" ON public.summaries;
DROP POLICY IF EXISTS "Users can insert summaries for their learning paths" ON public.summaries;
DROP POLICY IF EXISTS "Users can update summaries of their learning paths" ON public.summaries;
DROP POLICY IF EXISTS "Users can delete summaries of their learning paths" ON public.summaries;

-- Single unified policy for all operations
-- This works because FOR ALL with USING applies to SELECT/UPDATE/DELETE
-- and WITH CHECK applies to INSERT/UPDATE
CREATE POLICY "Users can manage summaries of their content bubbles"
ON public.summaries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = summaries.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);
