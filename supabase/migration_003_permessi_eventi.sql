-- ============================================================
-- Radio Marconi — permessi per modificare/eliminare eventi
-- Da eseguire in Supabase: SQL Editor -> New query
-- ============================================================

create policy "Capo reparto e RAD modificano eventi"
  on events for update using (public.current_ruolo() in ('capo', 'rad'));

create policy "Capo reparto e RAD eliminano eventi"
  on events for delete using (public.current_ruolo() in ('capo', 'rad'));
