-- Fix duplicate quiz questions, flashcards, and IOW entries
-- Problem: All quiz/flashcard/IOW items were getting the same interaction_id
-- and were being duplicated across different content bubbles

-- Root causes:
-- 1. saveQuizzes/saveFlashcards/saveIOWEntries were reusing IDs causing 409 conflicts
-- 2. Modal components were retaining state from previous openings

-- Solution:
-- 1. Code now lets database generate fresh UUIDs
-- 2. Modals now properly reset state when opening with new interaction

-- Clean up existing duplicate data
DELETE FROM public.quiz_attempts;
DELETE FROM public.iow_completions;
DELETE FROM public.quiz_questions;
DELETE FROM public.flashcards;
DELETE FROM public.iow_entries;

-- Note: Users will need to regenerate their interactive content
-- Each quiz/flashcard/IOW bubble will now be properly isolated per content bubble
