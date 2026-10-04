-- Fix security issue: Set fixed search_path for trigger function
-- This prevents the function from inheriting the caller's search_path at runtime
-- which could lead to security vulnerabilities or unexpected behavior

-- Drop and recreate the function with a fixed search_path
CREATE OR REPLACE FUNCTION public.update_interaction_summaries_updated_at()
RETURNS TRIGGER
SET search_path = public  -- Fixed search_path for security
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Note: The trigger itself doesn't need to be recreated
-- It will automatically use the updated function definition
