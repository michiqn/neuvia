-- Add indexes for foreign keys to improve JOIN performance
-- These indexes help with queries that join tables via foreign key relationships

-- content_bubbles.milestone_id
CREATE INDEX IF NOT EXISTS idx_content_bubbles_milestone_id
ON public.content_bubbles(milestone_id);

-- flashcards.interaction_id
CREATE INDEX IF NOT EXISTS idx_flashcards_interaction_id
ON public.flashcards(interaction_id);

-- interactions.content_bubble_id
CREATE INDEX IF NOT EXISTS idx_interactions_content_bubble_id
ON public.interactions(content_bubble_id);

-- iow_completions.iow_entry_id
CREATE INDEX IF NOT EXISTS idx_iow_completions_iow_entry_id
ON public.iow_completions(iow_entry_id);

-- iow_entries.interaction_id
CREATE INDEX IF NOT EXISTS idx_iow_entries_interaction_id
ON public.iow_entries(interaction_id);

-- milestones.learning_path_id
CREATE INDEX IF NOT EXISTS idx_milestones_learning_path_id
ON public.milestones(learning_path_id);

-- quiz_questions.interaction_id
CREATE INDEX IF NOT EXISTS idx_quiz_questions_interaction_id
ON public.quiz_questions(interaction_id);

-- summaries.interaction_id
CREATE INDEX IF NOT EXISTS idx_summaries_interaction_id
ON public.summaries(interaction_id);

-- Note: These indexes will significantly improve performance when:
-- 1. Fetching content_bubbles for a specific milestone
-- 2. Loading interactions and their related data (quizzes, flashcards, IOW entries)
-- 3. Querying milestones for a learning path
-- 4. Any CASCADE deletes on these relationships
