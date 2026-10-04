-- Add progress tracking tables for adaptive milestone generation
-- These tables track student performance to inform AI-generated content

-- Track quiz performance for adaptive generation
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track content bubble completions
CREATE TABLE IF NOT EXISTS public.content_bubble_completions (
  content_bubble_id UUID NOT NULL REFERENCES public.content_bubbles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (content_bubble_id, user_id)
);

-- Track IOW completions with quality scores
CREATE TABLE IF NOT EXISTS public.iow_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iow_entry_id UUID NOT NULL REFERENCES public.iow_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answer_quality_score NUMERIC(3,2) -- 0.00-1.00 from AI evaluation
);

-- Enable RLS on all tracking tables
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_bubble_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iow_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own progress data
DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage their own quiz attempts"
ON public.quiz_attempts FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own content completions" ON public.content_bubble_completions;
CREATE POLICY "Users can manage their own content completions"
ON public.content_bubble_completions FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own IOW completions" ON public.iow_completions;
CREATE POLICY "Users can manage their own IOW completions"
ON public.iow_completions FOR ALL
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_question_id ON public.quiz_attempts(quiz_question_id);
CREATE INDEX IF NOT EXISTS idx_content_completions_user_id ON public.content_bubble_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_iow_completions_user_id ON public.iow_completions(user_id);
