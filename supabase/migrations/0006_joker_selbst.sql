-- Joker setzt Paula selbst (Phil, 2026-10-16, aus LevelUp10): vorab für einen Tag, an dem sie keine Zeit hat,
-- oder nachträglich für verpasste Tage. Start mit 2 Jokern, alle 14 Streak-Tage einer dazu, höchstens 3.
-- Joker-Tage schreibt nur der Server mit Service Role (wie streaks), damit niemand per API Tage abdeckt.

create table if not exists public.joker_days (
  student_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (student_id, date)
);

alter table public.joker_days enable row level security;

drop policy if exists joker_days_read on public.joker_days;
create policy joker_days_read on public.joker_days for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));

alter table public.streaks alter column jokers set default 2;

-- Neustart mit 2 Jokern. Ein Streak, der schon vor gestern abgerissen ist, bleibt bei 0
-- (sonst würde die App anbieten, die alten Lücken nachträglich zu retten).
update public.streaks
set jokers = greatest(jokers, 2),
    current = case
      when last_completed_date < (now() at time zone 'Europe/Berlin')::date - 1 then 0
      else current
    end;
