-- Optimize RLS policies by wrapping auth.uid() with (select auth.uid())
-- This prevents re-evaluation for each row, improving query performance at scale

-- Profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING ((select auth.uid()) = user_id);

-- Learning paths table
DROP POLICY IF EXISTS "Users can view their own learning paths" ON public.learning_paths;
DROP POLICY IF EXISTS "Users can create their own learning paths" ON public.learning_paths;
DROP POLICY IF EXISTS "Users can update their own learning paths" ON public.learning_paths;
DROP POLICY IF EXISTS "Users can delete their own learning paths" ON public.learning_paths;

CREATE POLICY "Users can view their own learning paths"
ON public.learning_paths FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own learning paths"
ON public.learning_paths FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own learning paths"
ON public.learning_paths FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own learning paths"
ON public.learning_paths FOR DELETE USING ((select auth.uid()) = user_id);

-- Milestones table
DROP POLICY IF EXISTS "Users can view milestones of their learning paths" ON public.milestones;
DROP POLICY IF EXISTS "Users can create milestones for their learning paths" ON public.milestones;
DROP POLICY IF EXISTS "Users can update milestones of their learning paths" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete milestones of their learning paths" ON public.milestones;

CREATE POLICY "Users can view milestones of their learning paths"
ON public.milestones FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.learning_paths
    WHERE learning_paths.id = milestones.learning_path_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can create milestones for their learning paths"
ON public.milestones FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.learning_paths
    WHERE learning_paths.id = milestones.learning_path_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can update milestones of their learning paths"
ON public.milestones FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.learning_paths
    WHERE learning_paths.id = milestones.learning_path_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can delete milestones of their learning paths"
ON public.milestones FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.learning_paths
    WHERE learning_paths.id = milestones.learning_path_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- Content bubbles table
DROP POLICY IF EXISTS "Users can view content bubbles of their learning paths" ON public.content_bubbles;
DROP POLICY IF EXISTS "Users can create content bubbles for their learning paths" ON public.content_bubbles;
DROP POLICY IF EXISTS "Users can update content bubbles of their learning paths" ON public.content_bubbles;
DROP POLICY IF EXISTS "Users can delete content bubbles of their learning paths" ON public.content_bubbles;

CREATE POLICY "Users can view content bubbles of their learning paths"
ON public.content_bubbles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.milestones
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE milestones.id = content_bubbles.milestone_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can create content bubbles for their learning paths"
ON public.content_bubbles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.milestones
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE milestones.id = content_bubbles.milestone_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can update content bubbles of their learning paths"
ON public.content_bubbles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.milestones
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE milestones.id = content_bubbles.milestone_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can delete content bubbles of their learning paths"
ON public.content_bubbles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.milestones
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE milestones.id = content_bubbles.milestone_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- Interactions table
DROP POLICY IF EXISTS "Users can view interactions of their learning paths" ON public.interactions;
DROP POLICY IF EXISTS "Users can create interactions for their learning paths" ON public.interactions;
DROP POLICY IF EXISTS "Users can update interactions of their learning paths" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete interactions of their learning paths" ON public.interactions;

CREATE POLICY "Users can view interactions of their learning paths"
ON public.interactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = interactions.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can create interactions for their learning paths"
ON public.interactions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = interactions.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can update interactions of their learning paths"
ON public.interactions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = interactions.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can delete interactions of their learning paths"
ON public.interactions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = interactions.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- Quiz questions table
DROP POLICY IF EXISTS "Users can manage quiz questions of their learning paths" ON public.quiz_questions;

CREATE POLICY "Users can manage quiz questions of their learning paths"
ON public.quiz_questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.interactions
    JOIN public.content_bubbles ON content_bubbles.id = interactions.content_bubble_id
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE interactions.id = quiz_questions.interaction_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- Flashcards table
DROP POLICY IF EXISTS "Users can manage flashcards of their learning paths" ON public.flashcards;

CREATE POLICY "Users can manage flashcards of their learning paths"
ON public.flashcards FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.interactions
    JOIN public.content_bubbles ON content_bubbles.id = interactions.content_bubble_id
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE interactions.id = flashcards.interaction_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- IOW entries table
DROP POLICY IF EXISTS "Users can manage iow entries of their learning paths" ON public.iow_entries;

CREATE POLICY "Users can manage iow entries of their learning paths"
ON public.iow_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.interactions
    JOIN public.content_bubbles ON content_bubbles.id = interactions.content_bubble_id
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE interactions.id = iow_entries.interaction_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- Summaries table
DROP POLICY IF EXISTS "Users can manage summaries of their learning paths" ON public.summaries;

CREATE POLICY "Users can manage summaries of their learning paths"
ON public.summaries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = summaries.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);

-- Quiz attempts table
DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Users can manage their own quiz attempts"
ON public.quiz_attempts FOR ALL USING ((select auth.uid()) = user_id);

-- Content bubble completions table
DROP POLICY IF EXISTS "Users can manage their own content completions" ON public.content_bubble_completions;

CREATE POLICY "Users can manage their own content completions"
ON public.content_bubble_completions FOR ALL USING ((select auth.uid()) = user_id);

-- IOW completions table
DROP POLICY IF EXISTS "Users can manage their own IOW completions" ON public.iow_completions;

CREATE POLICY "Users can manage their own IOW completions"
ON public.iow_completions FOR ALL USING ((select auth.uid()) = user_id);

-- Content chat messages table
DROP POLICY IF EXISTS "Users can manage chat messages for their content bubbles" ON public.content_chat_messages;

CREATE POLICY "Users can manage chat messages for their content bubbles"
ON public.content_chat_messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles
    JOIN public.milestones ON milestones.id = content_bubbles.milestone_id
    JOIN public.learning_paths ON learning_paths.id = milestones.learning_path_id
    WHERE content_bubbles.id = content_chat_messages.content_bubble_id
    AND learning_paths.user_id = (select auth.uid())
  )
);
