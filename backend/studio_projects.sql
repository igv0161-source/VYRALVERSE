-- VYRALVERSE NEXUS STUDIO: private cloud project storage
-- Applied to Supabase project lrkntokhyyufgtwoeisw.
create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  project_data jsonb not null check (
    jsonb_typeof(project_data) = 'object'
    and octet_length(project_data::text) <= 524288
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_projects_owner_updated_idx
  on public.studio_projects (user_id, updated_at desc);
alter table public.studio_projects enable row level security;
revoke all privileges on table public.studio_projects from anon;
grant select, insert, update, delete on public.studio_projects to authenticated;
drop policy if exists "Users read their own studio projects" on public.studio_projects;
create policy "Users read their own studio projects"
  on public.studio_projects for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users create their own studio projects" on public.studio_projects;
create policy "Users create their own studio projects"
  on public.studio_projects for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users update their own studio projects" on public.studio_projects;
create policy "Users update their own studio projects"
  on public.studio_projects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete their own studio projects" on public.studio_projects;
create policy "Users delete their own studio projects"
  on public.studio_projects for delete to authenticated
  using ((select auth.uid()) = user_id);
