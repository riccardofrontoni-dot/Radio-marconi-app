-- ============================================================
-- Radio Marconi — eventi con più reparti coinvolti
-- Da eseguire in Supabase: SQL Editor -> New query
-- ============================================================

alter table events add column if not exists reparti text[] not null default '{}';

-- Porta i dati già presenti dal vecchio campo singolo "reparto" al nuovo elenco.
update events set reparti = array[reparto] where reparto is not null and reparti = '{}';
