-- Painel NUV: financeiro + relatórios de métricas.
-- Todas as tabelas têm RLS ligado e nenhuma policy: só o servidor do painel
-- (com a chave service_role) lê e escreve. Nada fica exposto pela chave pública.

create table if not exists public.fin_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  mensalidade numeric(12,2) not null default 0 check (mensalidade >= 0),
  dia_vencimento int not null default 10 check (dia_vencimento between 1 and 28),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fin_recorrentes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  categoria text not null default 'Outros',
  dia int not null default 5 check (dia between 1 and 28),
  cliente_id uuid references public.fin_clientes(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  data date not null,
  categoria text not null default 'Outros',
  cliente_id uuid references public.fin_clientes(id) on delete set null,
  forma_pagamento text,
  pago boolean not null default false,
  origem text not null default 'manual' check (origem in ('manual','mensalidade','recorrente')),
  origem_id uuid,
  competencia text not null check (competencia ~ '^\d{4}-\d{2}$'),
  observacao text,
  created_at timestamptz not null default now(),
  -- impede gerar a mesma mensalidade/conta fixa duas vezes no mesmo mês
  unique (origem, origem_id, competencia)
);

create index if not exists fin_lancamentos_competencia_idx on public.fin_lancamentos (competencia);
create index if not exists fin_lancamentos_data_idx on public.fin_lancamentos (data);

create table if not exists public.metricas_relatorios (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  rede text not null default 'Instagram',
  periodo_atual text not null,
  periodo_anterior text,
  metricas jsonb not null default '[]',
  posts jsonb not null default '[]',
  analise jsonb not null default '{}',
  arquivos text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists metricas_relatorios_cliente_idx on public.metricas_relatorios (cliente, created_at desc);

alter table public.fin_clientes enable row level security;
alter table public.fin_recorrentes enable row level security;
alter table public.fin_lancamentos enable row level security;
alter table public.metricas_relatorios enable row level security;

-- Clientes ativos hoje (ajuste a mensalidade e o vencimento pelo painel)
insert into public.fin_clientes (nome)
select n from (values ('Globex'), ('Beawst'), ('SINAIT')) as v(n)
where not exists (select 1 from public.fin_clientes);
