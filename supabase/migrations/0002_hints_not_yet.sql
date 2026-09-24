-- Tipps vor der Antwort und "Hatten wir noch nicht".

-- Tipp-Text je Aufgabe (aus content/*.json, Feld "hint").
alter table public.items add column if not exists hint text;

-- Antwort mit Tipp: richtig zählt nur als "teilweise".
alter table public.answers add column if not exists hint_used boolean not null default false;

-- Neues Ergebnis "not_yet": Aufgabe übersprungen, weil der Stoff im Unterricht noch nicht dran war.
alter table public.answers drop constraint if exists answers_result_check;
alter table public.answers add constraint answers_result_check
  check (result in ('correct', 'partial', 'wrong', 'skipped', 'not_yet'));

-- Skill zurückgestellt: bis zum Datum kommen keine neuen Aufgaben aus diesem Skill.
create table if not exists public.skill_snooze (
  student_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  until date not null,
  created_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

alter table public.skill_snooze enable row level security;

drop policy if exists skill_snooze_read on public.skill_snooze;
create policy skill_snooze_read on public.skill_snooze for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));

drop policy if exists skill_snooze_insert on public.skill_snooze;
create policy skill_snooze_insert on public.skill_snooze for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists skill_snooze_update on public.skill_snooze;
create policy skill_snooze_update on public.skill_snooze for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
