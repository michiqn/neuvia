-- Create feedback table for user bug reports and feature requests
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('bug', 'feature', 'general')),
  title text not null,
  description text,
  user_agent text,
  screen_size text,
  url text,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.feedback enable row level security;

-- Policy: Users can insert their own feedback
create policy "Users can insert their own feedback"
  on public.feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Allow admins/service role to read all feedback
create policy "Service role can read all feedback"
  on public.feedback
  for select
  to authenticated
  using (true);

-- Create index on user_id for faster queries
create index if not exists feedback_user_id_idx on public.feedback(user_id);

-- Create index on created_at for sorting
create index if not exists feedback_created_at_idx on public.feedback(created_at desc);

-- Create index on type for filtering
create index if not exists feedback_type_idx on public.feedback(type);
