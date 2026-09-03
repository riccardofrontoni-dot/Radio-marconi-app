-- ============================================================
-- Radio Marconi — Schema Completo e Definitivo
-- Da eseguire in Supabase: Dashboard -> SQL Editor -> New query
-- ============================================================

-- ---------- PROFILI ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  reparto text check (reparto in ('speaker', 'social', 'tecnico_video', 'tecnico_audio', 'qualita')),
  ruolo text not null default 'membro' check (ruolo in ('membro', 'capo', 'rad')),
  status text not null default 'in_attesa' check (status in ('in_attesa', 'attivo')),
  created_at timestamptz not null default now()
);

-- ---------- TASK ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  reparto text not null check (reparto in ('speaker', 'social', 'tecnico_video', 'tecnico_audio', 'qualita')),
  titolo text not null,
  completato boolean not null default false,
  assegnato_a uuid references profiles (id) on delete set null,
  puntata_data date,
  created_at timestamptz not null default now()
);

-- ---------- CALENDARIO & EVENTI ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  quando timestamptz not null,
  reparto text check (reparto in ('speaker', 'social', 'tecnico_video', 'tecnico_audio', 'qualita')),
  reparti text[] not null default '{}',
  chi text,
  created_at timestamptz not null default now()
);

comment on column events.chi is 'Chi conduce/è coinvolto nell''evento — es. nomi in diretta';

-- ---------- RESOCONTI QUALITÀ ----------
create table if not exists quality_reports (
  id uuid primary key default gen_random_uuid(),
  puntata_titolo text not null,
  punti_di_forza text,
  criticita text,
  voto smallint not null check (voto between 1 and 5),
  creato_da uuid references profiles (id) on delete set null,
  creato_il timestamptz not null default now()
);

-- ---------- STATISTICHE GIORNALIERE INSTAGRAM ----------
create table if not exists instagram_daily_stats (
  id uuid primary key default gen_random_uuid(),
  data date not null unique default current_date,
  follower integer not null default 0,
  views integer not null default 0,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGER: Creazione automatica profilatura al login
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) & FUNZIONI DI COMODO
-- ============================================================
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table events enable row level security;
alter table quality_reports enable row level security;
alter table instagram_daily_stats enable row level security;

create or replace function public.current_ruolo()
returns text as $$
  select ruolo from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.current_reparto()
returns text as $$
  select reparto from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---- POLICIES: profiles ----
create policy "Un utente vede e modifica il proprio profilo"
  on profiles for select using (auth.uid() = id);
create policy "Un utente aggiorna il proprio profilo"
  on profiles for update using (auth.uid() = id);

create policy "Il RAD vede tutti i profili"
  on profiles for select using (public.current_ruolo() = 'rad');
create policy "Il RAD assegna reparto e ruolo"
  on profiles for update using (public.current_ruolo() = 'rad');

-- ---- POLICIES: tasks ----
create policy "Il reparto vede i propri task"
  on tasks for select using (reparto = public.current_reparto() or public.current_ruolo() = 'rad');
create policy "Il reparto aggiorna i propri task"
  on tasks for update using (reparto = public.current_reparto() or public.current_ruolo() = 'rad');
create policy "Capo reparto e RAD creano task"
  on tasks for insert with check (
    public.current_ruolo() in ('capo', 'rad') and
    (reparto = public.current_reparto() or public.current_ruolo() = 'rad')
  );

-- ---- POLICIES: events ----
create policy "Tutti vedono il calendario"
  on events for select using (auth.uid() is not null);
create policy "Capo reparto e RAD creano eventi"
  on events for insert with check (public.current_ruolo() in ('capo', 'rad'));
create policy "Capo reparto e RAD modificano eventi"
  on events for update using (public.current_ruolo() in ('capo', 'rad'));
create policy "Capo reparto e RAD eliminano eventi"
  on events for delete using (public.current_ruolo() in ('capo', 'rad'));

-- ---- POLICIES: quality_reports ----
create policy "Qualità e RAD leggono i resoconti"
  on quality_reports for select using (public.current_ruolo() = 'rad' or public.current_reparto() = 'qualita');
create policy "Qualità crea resoconti"
  on quality_reports for insert with check (public.current_reparto() = 'qualita' or public.current_ruolo() = 'rad');

-- ---- POLICIES: instagram_daily_stats ----
create policy "Tutti gli utenti autenticati vedono i dati social"
  on instagram_daily_stats for select using (auth.uid() is not null);
create policy "Il RAD gestisce i dati social"
  on instagram_daily_stats for all using (public.current_ruolo() = 'rad');