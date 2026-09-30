-- Falsche Aufgaben kommen in derselben Runde wieder (Phil, 2026-09-30: 12 Aufgaben in 3 Minuten durchgeklickt).
-- Die erste Antwort bleibt maßgeblich für SM-2 und Statistik; Wiederholungen zählen nur Versuche und Zeit.

alter table public.answers add column if not exists solved boolean not null default false;
alter table public.answers add column if not exists attempts int not null default 1;

-- Bestehende Antworten: gelöst, wenn richtig oder mit Tipp richtig (Tipp + teilweise ist hier nicht unterscheidbar).
update public.answers
set solved = result = 'correct' or (result = 'partial' and hint_used)
where not solved;

-- Für die Elternansicht: Fehler beim ersten Versuch und zusätzliche Versuche.
alter table public.sessions add column if not exists mistakes int not null default 0;
alter table public.sessions add column if not exists retries int not null default 0;

update public.sessions s
set mistakes = (
  select count(*) from public.answers a
  where a.session_id = s.id and a.result <> 'not_yet' and (a.result = 'wrong' or not a.solved)
);
