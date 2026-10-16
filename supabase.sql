-- À coller dans Supabase > SQL Editor > Run. Peut être relancé sans risque (même si l'ancienne version a déjà été exécutée).

-- ========== SERVEURS ==========
create table if not exists public.servers (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  name text not null,
  created bigint not null,
  data jsonb not null default '{}'::jsonb
);
alter table public.servers add column if not exists status text not null default 'offline';
alter table public.servers add column if not exists address text not null default '';
alter table public.servers add column if not exists last_seen timestamptz;
alter table public.servers enable row level security;

drop policy if exists "read own or shared" on public.servers;
drop policy if exists "create own" on public.servers;
drop policy if exists "update own or shared" on public.servers;
drop policy if exists "delete own" on public.servers;

create policy "read own or shared" on public.servers for select to authenticated
using (owner_id = auth.uid()
  or data->'access' @> jsonb_build_array(jsonb_build_object('email', lower(auth.jwt()->>'email'))));
create policy "create own" on public.servers for insert to authenticated
with check (owner_id = auth.uid());
create policy "update own or shared" on public.servers for update to authenticated
using (owner_id = auth.uid()
  or data->'access' @> jsonb_build_array(jsonb_build_object('email', lower(auth.jwt()->>'email'))))
with check (true);
create policy "delete own" on public.servers for delete to authenticated
using (owner_id = auth.uid());

-- Un utilisateur connecté ne peut changer ni le propriétaire ni l'état envoyé par l'agent.
create or replace function public.keep_owner() returns trigger language plpgsql as $$
begin
  new.owner_id := old.owner_id;
  new.owner_email := old.owner_email;
  if auth.uid() is not null then
    new.status := old.status; new.address := old.address; new.last_seen := old.last_seen;
  end if;
  return new;
end $$;
drop trigger if exists keep_owner on public.servers;
create trigger keep_owner before update on public.servers for each row execute function public.keep_owner();

-- ========== CLÉS DES SERVEURS (visibles uniquement par le propriétaire) ==========
create table if not exists public.server_keys (
  server_id text primary key references public.servers(id) on delete cascade,
  key text not null unique
);
alter table public.server_keys enable row level security;
drop policy if exists "owner manages key" on public.server_keys;
create policy "owner manages key" on public.server_keys for all to authenticated
using (exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid()))
with check (exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid()));

-- ========== FONCTIONS POUR L'AGENT (il ne se connecte pas, il présente sa clé) ==========
create or replace function public.agent_pull(k text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('name', s.name, 'settings', s.data->'settings')
  from servers s join server_keys sk on sk.server_id = s.id where sk.key = k limit 1;
$$;
create or replace function public.agent_push(k text, st text, addr text) returns void
language sql security definer set search_path = public as $$
  update servers s set status = left(st, 16), address = left(addr, 100), last_seen = now()
  from server_keys sk where sk.server_id = s.id and sk.key = k;
$$;
grant execute on function public.agent_pull(text), public.agent_push(text, text, text) to anon, authenticated;

-- ========== PROFILS (pseudo, bio, photo) ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null check (char_length(name) between 3 and 24),
  bio text not null default '' check (char_length(bio) <= 140),
  avatar text not null default '' check (char_length(avatar) <= 200000)
);
create unique index if not exists profiles_name_key on public.profiles (lower(name));
alter table public.profiles enable row level security;
drop policy if exists "profiles readable" on public.profiles;
drop policy if exists "profile insert own" on public.profiles;
drop policy if exists "profile update own" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profile insert own" on public.profiles for insert to authenticated
with check (id = auth.uid() and email = lower(auth.jwt()->>'email'));
create policy "profile update own" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and email = lower(auth.jwt()->>'email'));
