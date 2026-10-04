-- Create table to store content chat messages
-- This allows chat history to persist when content bubbles are reopened
CREATE TABLE IF NOT EXISTS public.content_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_bubble_id UUID NOT NULL REFERENCES public.content_bubbles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only access chat messages for their own content bubbles
DROP POLICY IF EXISTS "Users can manage chat messages for their content bubbles" ON public.content_chat_messages;
CREATE POLICY "Users can manage chat messages for their content bubbles"
ON public.content_chat_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.content_bubbles cb
    JOIN public.milestones m ON m.id = cb.milestone_id
    JOIN public.learning_paths lp ON lp.id = m.learning_path_id
    WHERE cb.id = content_chat_messages.content_bubble_id
    AND lp.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_chat_messages_bubble_id
ON public.content_chat_messages(content_bubble_id);

CREATE INDEX IF NOT EXISTS idx_content_chat_messages_user_id
ON public.content_chat_messages(user_id);
