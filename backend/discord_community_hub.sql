-- VYRALVERSE Discord-inspired community hub
-- Adds persistent text channels, reply threads and per-user emoji reactions.
alter table public.community_messages
  add column if not exists channel text not null default 'general',
  add column if not exists reply_to uuid null references public.community_messages(id) on delete set null,
  add column if not exists pinned_at timestamptz null;

alter table public.community_messages drop constraint if exists community_messages_channel_check;
alter table public.community_messages add constraint community_messages_channel_check
  check (channel in ('general','introductions','showcase','help','off-topic'));

create index if not exists community_messages_channel_created_idx
  on public.community_messages(channel, created_at desc);
create index if not exists community_messages_reply_to_idx
  on public.community_messages(reply_to) where reply_to is not null;

create table if not exists public.community_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','🔥','✨','👀')),
  created_at timestamptz not null default now(),
  unique(message_id,user_id,emoji)
);
create index if not exists community_message_reactions_message_idx
  on public.community_message_reactions(message_id);

alter table public.community_message_reactions enable row level security;
grant select on public.community_message_reactions to anon, authenticated;
grant insert, delete on public.community_message_reactions to authenticated;

drop policy if exists "community reactions are publicly readable" on public.community_message_reactions;
create policy "community reactions are publicly readable"
  on public.community_message_reactions for select to anon, authenticated using (true);
drop policy if exists "explorers react as themselves" on public.community_message_reactions;
create policy "explorers react as themselves"
  on public.community_message_reactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "explorers remove their own reactions" on public.community_message_reactions;
create policy "explorers remove their own reactions"
  on public.community_message_reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='community_message_reactions') then
    alter publication supabase_realtime add table public.community_message_reactions;
  end if;
end $$;
