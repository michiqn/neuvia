-- Columns that were added to the hosted database directly and never captured in a migration
ALTER TABLE public.content_bubbles ADD COLUMN IF NOT EXISTS user_topic_input text;
ALTER TABLE public.content_bubbles ADD COLUMN IF NOT EXISTS suggested_topic text;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;
