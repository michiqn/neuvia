-- Fix RLS policy for summaries table
-- The current policy uses USING only which doesn't work for INSERT operations
-- Also handle nullable content_bubble_id

DROP POLICY IF EXISTS "Users can manage summaries of their learning paths" ON public.summaries;

-- Create separate policies for different operations
-- SELECT: Users can view summaries of their content bubbles
CREATE POLICY "Users can view summaries of their learning paths"
ON public.summaries FOR SELECT USING (
  content_bubble_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = summaries.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- INSERT: Users can create summaries for their content bubbles
CREATE POLICY "Users can insert summaries for their learning paths"
ON public.summaries FOR INSERT WITH CHECK (
  content_bubble_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = summaries.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- UPDATE: Users can update summaries of their content bubbles
CREATE POLICY "Users can update summaries of their learning paths"
ON public.summaries FOR UPDATE USING (
  content_bubble_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = summaries.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- DELETE: Users can delete summaries of their content bubbles
CREATE POLICY "Users can delete summaries of their learning paths"
ON public.summaries FOR DELETE USING (
  content_bubble_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = summaries.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);
