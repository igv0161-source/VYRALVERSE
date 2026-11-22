-- Enable authenticated quest creators to receive realtime completion events.
-- quest_completions already has RLS policies that allow a user to read their own
-- completion and a quest creator to read completions for quests they own.
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_completions;
