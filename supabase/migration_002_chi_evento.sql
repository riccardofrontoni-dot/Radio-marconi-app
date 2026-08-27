-- ============================================================
-- Radio Marconi — aggiunta campo "chi" agli eventi
-- Da eseguire in Supabase: SQL Editor -> New query
-- ============================================================

alter table events add column if not exists chi text;
comment on column events.chi is 'Chi conduce/è coinvolto nell''evento — es. nomi in diretta';
