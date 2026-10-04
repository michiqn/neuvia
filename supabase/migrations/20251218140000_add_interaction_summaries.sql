-- Add interaction_summaries table for storing per-interaction summary sentences
-- These are generated asynchronously after each interaction creation

CREATE TABLE IF NOT EXISTS public.interaction_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  content_bubble_id UUID NOT NULL REFERENCES public.content_bubbles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('quiz', 'flashcard', 'iow')),
  summary_sentence TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(interaction_id)
);

-- Enable RLS
ALTER TABLE public.interaction_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can read summaries for content they have access to
-- (via learning path ownership)
DROP POLICY IF EXISTS "Users can read interaction summaries for their content" ON public.interaction_summaries;
CREATE POLICY "Users can read interaction summaries for their content"
ON public.interaction_summaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles cb
    JOIN public.milestones m ON cb.milestone_id = m.id
    JOIN public.learning_paths lp ON m.learning_path_id = lp.id
    WHERE cb.id = interaction_summaries.content_bubble_id
    AND lp.user_id = auth.uid()
  )
);

-- RLS policy: service role can insert/update (edge functions)
DROP POLICY IF EXISTS "Service role can manage interaction summaries" ON public.interaction_summaries;
CREATE POLICY "Service role can manage interaction summaries"
ON public.interaction_summaries FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interaction_summaries_content_bubble 
ON public.interaction_summaries(content_bubble_id);

CREATE INDEX IF NOT EXISTS idx_interaction_summaries_interaction 
ON public.interaction_summaries(interaction_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_interaction_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_interaction_summaries_updated_at ON public.interaction_summaries;
CREATE TRIGGER trigger_interaction_summaries_updated_at
BEFORE UPDATE ON public.interaction_summaries
FOR EACH ROW
EXECUTE FUNCTION update_interaction_summaries_updated_at();
