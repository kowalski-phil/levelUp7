-- LevelUp7: Paula hat Englisch (E) und Französisch (F). 0001 erlaubte nur Felix' Fächer D, E, M, B.
-- Eigene Datei statt 0001 zu ändern, damit 0001 bis 0004 identisch mit LevelUp10 bleiben (Cherry-Picks).

alter table public.subjects drop constraint if exists subjects_code_check;
alter table public.subjects add constraint subjects_code_check check (code in ('E', 'F'));
