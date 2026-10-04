-- Add firstTopic column to milestones
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS first_topic text;

-- Create content_bubbles table
CREATE TABLE public.content_bubbles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create interactions table (quiz, flashcard, iow bubbles)
CREATE TABLE public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_bubble_id uuid NOT NULL REFERENCES public.content_bubbles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('quiz', 'flashcard', 'iow', 'help')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  question text NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create flashcards table
CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create iow_entries table
CREATE TABLE public.iow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create summaries table
CREATE TABLE public.summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_bubble_id uuid NOT NULL UNIQUE REFERENCES public.content_bubbles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.content_bubbles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_bubbles (through milestones -> learning_paths)
CREATE POLICY "Users can view content bubbles of their learning paths"
ON public.content_bubbles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.milestones m
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE m.id = content_bubbles.milestone_id AND lp.user_id = auth.uid()
));

CREATE POLICY "Users can create content bubbles for their learning paths"
ON public.content_bubbles FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.milestones m
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE m.id = content_bubbles.milestone_id AND lp.user_id = auth.uid()
));

CREATE POLICY "Users can update content bubbles of their learning paths"
ON public.content_bubbles FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.milestones m
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE m.id = content_bubbles.milestone_id AND lp.user_id = auth.uid()
));

CREATE POLICY "Users can delete content bubbles of their learning paths"
ON public.content_bubbles FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.milestones m
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE m.id = content_bubbles.milestone_id AND lp.user_id = auth.uid()
));

-- RLS policies for interactions (through content_bubbles -> milestones -> learning_paths)
CREATE POLICY "Users can view interactions of their learning paths"
ON public.interactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.content_bubbles cb
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE cb.id = interactions.content_bubble_id AND lp.user_id = auth.uid()
));

CREATE POLICY "Users can create interactions for their learning paths"
ON public.interactions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.content_bubbles cb
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE cb.id = interactions.content_bubble_id AND lp.user_id = auth.uid()
));

CREATE POLICY "Users can update interactions of their learning paths"
ON public.interactions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.content_bubbles cb
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE cb.id = interactions.content_bubble_id AND lp.user_id = auth.uid()
));

CREATE POLICY "Users can delete interactions of their learning paths"
ON public.interactions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.content_bubbles cb
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE cb.id = interactions.content_bubble_id AND lp.user_id = auth.uid()
));

-- RLS policies for quiz_questions
CREATE POLICY "Users can manage quiz questions of their learning paths"
ON public.quiz_questions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.interactions i
  JOIN public.content_bubbles cb ON cb.id = i.content_bubble_id
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE i.id = quiz_questions.interaction_id AND lp.user_id = auth.uid()
));

-- RLS policies for flashcards
CREATE POLICY "Users can manage flashcards of their learning paths"
ON public.flashcards FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.interactions i
  JOIN public.content_bubbles cb ON cb.id = i.content_bubble_id
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE i.id = flashcards.interaction_id AND lp.user_id = auth.uid()
));

-- RLS policies for iow_entries
CREATE POLICY "Users can manage iow entries of their learning paths"
ON public.iow_entries FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.interactions i
  JOIN public.content_bubbles cb ON cb.id = i.content_bubble_id
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE i.id = iow_entries.interaction_id AND lp.user_id = auth.uid()
));

-- RLS policies for summaries
CREATE POLICY "Users can manage summaries of their learning paths"
ON public.summaries FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.content_bubbles cb
  JOIN public.milestones m ON m.id = cb.milestone_id
  JOIN public.learning_paths lp ON lp.id = m.learning_path_id
  WHERE cb.id = summaries.content_bubble_id AND lp.user_id = auth.uid()
));

-- Add updated_at triggers
CREATE TRIGGER update_content_bubbles_updated_at
BEFORE UPDATE ON public.content_bubbles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at
BEFORE UPDATE ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at
BEFORE UPDATE ON public.summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();