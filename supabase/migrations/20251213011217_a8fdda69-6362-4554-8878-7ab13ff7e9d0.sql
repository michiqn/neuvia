-- Create learning_paths table
CREATE TABLE public.learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Learning paths policies
CREATE POLICY "Users can view their own learning paths" 
ON public.learning_paths FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning paths" 
ON public.learning_paths FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning paths" 
ON public.learning_paths FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning paths" 
ON public.learning_paths FOR DELETE 
USING (auth.uid() = user_id);

-- Milestones policies (via learning path ownership)
CREATE POLICY "Users can view milestones of their learning paths" 
ON public.milestones FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.learning_paths 
  WHERE learning_paths.id = milestones.learning_path_id 
  AND learning_paths.user_id = auth.uid()
));

CREATE POLICY "Users can create milestones for their learning paths" 
ON public.milestones FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.learning_paths 
  WHERE learning_paths.id = milestones.learning_path_id 
  AND learning_paths.user_id = auth.uid()
));

CREATE POLICY "Users can update milestones of their learning paths" 
ON public.milestones FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.learning_paths 
  WHERE learning_paths.id = milestones.learning_path_id 
  AND learning_paths.user_id = auth.uid()
));

CREATE POLICY "Users can delete milestones of their learning paths" 
ON public.milestones FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.learning_paths 
  WHERE learning_paths.id = milestones.learning_path_id 
  AND learning_paths.user_id = auth.uid()
));

-- Add updated_at triggers
CREATE TRIGGER update_learning_paths_updated_at
BEFORE UPDATE ON public.learning_paths
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();