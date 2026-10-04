-- Fix summaries table for proper upsert support
-- Add UNIQUE constraint on content_bubble_id for upsert to work

-- First, delete any duplicate entries (keep only the latest one per content_bubble_id)
DELETE FROM public.summaries a
USING public.summaries b
WHERE a.content_bubble_id = b.content_bubble_id 
  AND a.content_bubble_id IS NOT NULL
  AND a.created_at < b.created_at;

-- Add unique constraint on content_bubble_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS summaries_content_bubble_id_unique 
ON public.summaries(content_bubble_id) 
WHERE content_bubble_id IS NOT NULL;
