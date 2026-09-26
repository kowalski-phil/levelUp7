-- Fokus-Modus: gezielt auf eine Schulaufgabe lernen (docs/fokus-modus.md).

-- Schulaufgaben, die Felix eingetragen hat. Aktiv, solange exam_date >= heute.
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  exam_date date not null,
  number int not null,
  skill_ids jsonb not null check (jsonb_typeof(skill_ids) = 'array' and jsonb_array_length(skill_ids) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exams_student_date_idx on public.exams (student_id, exam_date);

alter table public.exams enable row level security;

drop policy if exists exams_read on public.exams;
create policy exams_read on public.exams for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));

drop policy if exists exams_insert on public.exams;
create policy exams_insert on public.exams for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists exams_update on public.exams;
create policy exams_update on public.exams for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists exams_delete on public.exams;
create policy exams_delete on public.exams for delete to authenticated
  using (student_id = auth.uid());

-- "Hatten wir noch nicht" wird beim Anlegen einer Schulaufgabe für die gewählten Skills aufgehoben.
drop policy if exists skill_snooze_delete on public.skill_snooze;
create policy skill_snooze_delete on public.skill_snooze for delete to authenticated
  using (student_id = auth.uid());

-- Fokus-Sessions: dritte Session-Art, verweist auf die Schulaufgabe.
alter table public.sessions drop constraint if exists sessions_kind_check;
alter table public.sessions add constraint sessions_kind_check
  check (kind in ('daily', 'bonus', 'focus'));
alter table public.sessions add column if not exists exam_id uuid references public.exams (id) on delete set null;
create index if not exists sessions_exam_idx on public.sessions (exam_id) where exam_id is not null;
