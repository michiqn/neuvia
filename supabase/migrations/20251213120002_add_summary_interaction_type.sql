-- Add 'summary' to the allowed interaction types
ALTER TABLE public.interactions
DROP CONSTRAINT interactions_type_check;

ALTER TABLE public.interactions
ADD CONSTRAINT interactions_type_check
CHECK (type = ANY (ARRAY['quiz'::text, 'flashcard'::text, 'iow'::text, 'summary'::text, 'help'::text]));

-- Add interaction_id column to summaries table (nullable for backward compatibility)
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS interaction_id uuid REFERENCES public.interactions(id);

-- Make content_bubble_id nullable since summaries can now be tied to interactions
ALTER TABLE public.summaries
ALTER COLUMN content_bubble_id DROP NOT NULL;

-- Drop the unique constraint on content_bubble_id since we might have multiple summaries
-- (one old-style tied to content_bubble, one new-style tied to interaction)
ALTER TABLE public.summaries
DROP CONSTRAINT IF EXISTS summaries_content_bubble_id_key;
