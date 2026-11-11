-- Demandas que se repetem (diária, dias úteis, semanal, quinzenal, mensal).
-- A regra fica aqui; cada repetição vira uma página normal no Notion (Minha Semana Produtiva - NUV).
create table public.demandas_recorrentes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(titulo) between 1 and 300),
  cliente text,
  prioridade text,
  duracao text,
  frequencia text not null check (frequencia in ('diaria','dias_uteis','semanal','quinzenal','mensal')),
  data_inicio date not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Uma linha por repetição já criada: impede criar a mesma demanda duas vezes no mesmo dia.
create table public.demandas_geradas (
  recorrente_id uuid not null references public.demandas_recorrentes(id) on delete cascade,
  data date not null,
  notion_page_id text,
  created_at timestamptz not null default now(),
  primary key (recorrente_id, data)
);
create index demandas_geradas_page_idx on public.demandas_geradas (notion_page_id);

alter table public.demandas_recorrentes enable row level security;
alter table public.demandas_geradas enable row level security;
