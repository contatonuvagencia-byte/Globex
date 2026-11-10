-- Prospecção (trazido do projeto nuv-leads, mesma estrutura).
-- As policies is_team() continuam valendo para quem acessar pelo Supabase Auth;
-- o painel acessa pelo servidor com a service_role.

do $$ begin
  create type public.lead_niche as enum ('saude','b2b','institucional','outro');
  create type public.site_status as enum ('desconhecido','sem_site','fraco','bom');
  create type public.ig_status as enum ('desconhecido','inexistente','parado','fraco','ativo');
  create type public.company_size as enum ('desconhecido','pequeno','medio','grande');
  create type public.lead_status as enum ('novo','contatado','respondeu','reuniao','proposta','fechado','perdido');
  create type public.interaction_type as enum ('whatsapp','instagram','email','ligacao','reuniao','nota','status');
exception when duplicate_object then null; end $$;

create table if not exists public.team_members (
  email text primary key,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  niche public.lead_niche not null default 'outro',
  category text,
  city text default 'Belo Horizonte',
  neighborhood text,
  address text,
  phone text,
  whatsapp text,
  email text,
  website text,
  site_status public.site_status not null default 'desconhecido',
  instagram text,
  ig_status public.ig_status not null default 'desconhecido',
  ig_followers int,
  ig_last_post date,
  google_rating numeric,
  google_reviews int,
  maps_url text,
  size public.company_size not null default 'desconhecido',
  units int,
  diagnosis text,
  opportunity text,
  message text,
  score int not null default 0,
  status public.lead_status not null default 'novo',
  next_followup_at timestamptz,
  last_contact_at timestamptz,
  lost_reason text,
  notes text,
  source text default 'pesquisa Claude',
  created_by text default (auth.jwt() ->> 'email')
);

create unique index if not exists leads_name_city_uniq on public.leads (lower(name), lower(coalesce(city, '')));
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_followup_idx on public.leads (next_followup_at) where next_followup_at is not null;

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  type public.interaction_type not null,
  content text,
  created_by text default (auth.jwt() ->> 'email')
);
create index if not exists interactions_lead_idx on public.interactions (lead_id, created_at desc);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  niche public.lead_niche,
  channel text not null check (channel in ('whatsapp','instagram','email','followup')),
  subject text,
  body text not null
);

create or replace function public.lead_score(l public.leads) returns integer
language sql immutable set search_path to 'public' as $$
  select least(100,
    (case l.ig_status when 'inexistente' then 30 when 'parado' then 30 when 'fraco' then 22 when 'ativo' then 5 else 10 end)
  + (case l.site_status when 'sem_site' then 25 when 'fraco' then 15 when 'bom' then 0 else 8 end)
  + (case l.size when 'grande' then 30 when 'medio' then 22 when 'pequeno' then 5 else 10 end)
  + (case when coalesce(l.units,1) > 1 then 5 else 0 end)
  + (case when coalesce(l.google_reviews,0) >= 100 then 7 when coalesce(l.google_reviews,0) >= 30 then 4 else 0 end)
  + (case when coalesce(l.google_rating,0) >= 4.5 then 3 else 0 end)
  );
$$;

create or replace function public.compute_lead_score() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  new.score := public.lead_score(new);
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists leads_score on public.leads;
create trigger leads_score before insert or update on public.leads
  for each row execute function public.compute_lead_score();

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.team_members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

alter table public.team_members enable row level security;
alter table public.leads enable row level security;
alter table public.interactions enable row level security;
alter table public.templates enable row level security;

drop policy if exists team_read_members on public.team_members;
create policy team_read_members on public.team_members for select to authenticated using (public.is_team());
drop policy if exists team_all_leads on public.leads;
create policy team_all_leads on public.leads for all to authenticated using (public.is_team()) with check (public.is_team());
drop policy if exists team_all_interactions on public.interactions;
create policy team_all_interactions on public.interactions for all to authenticated using (public.is_team()) with check (public.is_team());
drop policy if exists team_all_templates on public.templates;
create policy team_all_templates on public.templates for all to authenticated using (public.is_team()) with check (public.is_team());

do $$ begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null; end $$;

-- is_team() só precisa ser chamada por usuários logados (as policies acima)
revoke execute on function public.is_team() from public, anon;
grant execute on function public.is_team() to authenticated;
