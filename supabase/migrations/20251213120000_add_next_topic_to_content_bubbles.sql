-- Add next_topic column to content_bubbles table
ALTER TABLE public.content_bubbles ADD COLUMN IF NOT EXISTS next_topic text;

COMMENT ON COLUMN public.content_bubbles.next_topic IS 'Suggested next topic to learn after this content bubble';
