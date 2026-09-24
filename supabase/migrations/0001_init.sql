-- LevelUp10: Datenmodell (PLAN.md Abschnitt 3) mit Row Level Security.
-- Schreibrechte:
--   Schüler: item_state, sessions, answers (nur eigene Zeilen).
--   Eltern: rewards_config, rewards_ledger.paid_at (nur eigene Familie).
--   streaks und rewards_ledger (neue Einträge) schreibt nur der Server mit Service Role,
--   damit sich niemand Streak oder Geld per API selbst gutschreiben kann.
--   Inhalte (subjects, units, skills, items, unit_schedule) schreibt nur das Seed-Skript.

create extension if not exists pgcrypto;

-- ---------- Familie und Rollen ----------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  student_id uuid unique references auth.users (id) on delete set null,
  parent_id uuid references auth.users (id) on delete set null,
  school_year_start date not null default '2026-09-16',
  exam_date date not null default '2027-06-23'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'parent')),
  family_id uuid references public.families (id) on delete set null,
  display_name text not null,
  onboarded_at timestamptz
);

-- ---------- Inhalte ----------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('D', 'E', 'M', 'B')),
  name text not null,
  color text not null
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  code text not null unique,
  title text not null,
  hours int not null default 0,
  order_index int not null
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  code text not null unique,
  title text not null,
  description text not null default '',
  order_index int not null
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  skill_id uuid not null references public.skills (id) on delete cascade,
  type text not null,
  difficulty int not null check (difficulty between 1 and 3),
  stem text not null,
  payload jsonb not null,
  solution jsonb,
  explanation text not null,
  version int not null default 1,
  active boolean not null default true
);
create index items_skill_idx on public.items (skill_id);

create table public.unit_schedule (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  week_from int not null,
  week_to int not null,
  primary key (unit_id)
);

-- ---------- Lernstand ----------

create table public.item_state (
  student_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  ease real not null default 2.5,
  interval_days int not null default 0,
  due_date date not null,
  reps int not null default 0,
  lapses int not null default 0,
  last_result text check (last_result in ('correct', 'partial', 'wrong', 'skipped')),
  primary key (student_id, item_id)
);
create index item_state_due_idx on public.item_state (student_id, due_date);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kind text not null default 'daily' check (kind in ('daily', 'bonus')),
  planned_item_ids jsonb not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_sec int,
  correct int not null default 0,
  total int not null default 0,
  xp int not null default 0,
  summary jsonb
);
create unique index sessions_one_daily on public.sessions (student_id, date) where kind = 'daily';
create index sessions_student_date_idx on public.sessions (student_id, date);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  result text not null check (result in ('correct', 'partial', 'wrong', 'skipped')),
  answer jsonb not null,
  time_sec int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, item_id)
);
create index answers_student_idx on public.answers (student_id, created_at);

-- ---------- Streak und Belohnung ----------

create table public.streaks (
  student_id uuid primary key references auth.users (id) on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  jokers int not null default 0,
  last_completed_date date
);

create table public.rewards_config (
  family_id uuid primary key references public.families (id) on delete cascade,
  weekly_streak_bonus_eur numeric(8, 2) not null default 5,
  milestones jsonb not null default '[{"days":30,"eur":20,"label":"30 Tage am Stück"},{"days":60,"eur":30,"label":"60 Tage am Stück"},{"days":100,"eur":50,"label":"100 Tage am Stück"}]',
  exam_day_eur numeric(8, 2) not null default 100
);

create table public.rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  label text not null default '',
  amount_eur numeric(8, 2) not null,
  earned_at timestamptz not null default now(),
  paid_at timestamptz
);
create index rewards_ledger_student_idx on public.rewards_ledger (student_id, earned_at);

create table public.push_subscriptions (
  student_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  primary key (student_id, endpoint)
);

-- ---------- Hilfsfunktionen für RLS ----------

create or replace function public.is_parent_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from families f where f.student_id = student and f.parent_id = auth.uid());
$$;

create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from profiles where id = auth.uid();
$$;

-- ---------- RLS ----------

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.skills enable row level security;
alter table public.items enable row level security;
alter table public.unit_schedule enable row level security;
alter table public.item_state enable row level security;
alter table public.sessions enable row level security;
alter table public.answers enable row level security;
alter table public.streaks enable row level security;
alter table public.rewards_config enable row level security;
alter table public.rewards_ledger enable row level security;
alter table public.push_subscriptions enable row level security;

-- Familie und Profile: eigene lesen, Eltern sehen das Profil des Kindes.
create policy families_read on public.families for select to authenticated
  using (id = public.my_family_id());
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_parent_of(id));

-- Inhalte: für alle Eingeloggten lesbar.
create policy subjects_read on public.subjects for select to authenticated using (true);
create policy units_read on public.units for select to authenticated using (true);
create policy skills_read on public.skills for select to authenticated using (true);
create policy items_read on public.items for select to authenticated using (true);
create policy unit_schedule_read on public.unit_schedule for select to authenticated using (true);

-- Lernstand: Schüler liest und schreibt eigene Zeilen, Eltern lesen.
create policy item_state_read on public.item_state for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy item_state_write on public.item_state for insert to authenticated
  with check (student_id = auth.uid());
create policy item_state_update on public.item_state for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy sessions_read on public.sessions for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy sessions_insert on public.sessions for insert to authenticated
  with check (student_id = auth.uid());
create policy sessions_update on public.sessions for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy answers_read on public.answers for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy answers_insert on public.answers for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.sessions s where s.id = session_id and s.student_id = auth.uid())
  );

-- Streak: nur lesen (Schreiben über Service Role im Server).
create policy streaks_read on public.streaks for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));

-- Belohnungen: beide lesen, Eltern konfigurieren und markieren "ausgezahlt".
create policy rewards_config_read on public.rewards_config for select to authenticated
  using (family_id = public.my_family_id());
create policy rewards_config_update on public.rewards_config for update to authenticated
  using (family_id = public.my_family_id() and exists (select 1 from families f where f.id = family_id and f.parent_id = auth.uid()))
  with check (family_id = public.my_family_id());

create policy rewards_ledger_read on public.rewards_ledger for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy rewards_ledger_mark_paid on public.rewards_ledger for update to authenticated
  using (public.is_parent_of(student_id)) with check (public.is_parent_of(student_id));

-- Eltern dürfen im Ledger nur paid_at ändern.
revoke update on public.rewards_ledger from authenticated;
grant update (paid_at) on public.rewards_ledger to authenticated;

create policy push_read on public.push_subscriptions for select to authenticated
  using (student_id = auth.uid());
create policy push_write on public.push_subscriptions for insert to authenticated
  with check (student_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (student_id = auth.uid());

-- Onboarding-Markierung: Schüler darf nur onboarded_at am eigenen Profil setzen.
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (onboarded_at) on public.profiles to authenticated;
