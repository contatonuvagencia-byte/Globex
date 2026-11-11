-- Ficha do cliente (a tabela fin_clientes vira o cadastro completo) + propostas + metas do mês.
alter table public.fin_clientes
  add column if not exists segmento text,
  add column if not exists contato_nome text,
  add column if not exists contato_whatsapp text,
  add column if not exists contato_email text,
  add column if not exists instagram text,
  add column if not exists site text,
  add column if not exists servicos text[] not null default '{}',
  add column if not exists contrato_inicio date,
  add column if not exists contrato_meses int check (contrato_meses between 1 and 60),
  add column if not exists contrato_fim date,
  add column if not exists briefing text,
  add column if not exists acessos text,
  add column if not exists observacoes text,
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

-- Propostas comerciais com link público (o cliente vê e aceita sem login)
create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  cliente text not null check (length(cliente) between 1 and 160),
  titulo text not null default 'Proposta comercial',
  apresentacao text,
  itens jsonb not null default '[]',          -- [{ descricao, valor, recorrente }]
  condicoes text,
  validade date,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','vista','aceita','recusada')),
  token_publico text unique,
  visualizacoes int not null default 0,
  visto_em timestamptz,
  respondido_em timestamptz,
  respondido_por text,
  resposta_obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index propostas_status_idx on public.propostas (status, created_at desc);
alter table public.propostas enable row level security;

-- Meta de cada mês
create table public.metas (
  mes text primary key check (mes ~ '^\d{4}-\d{2}$'),
  faturamento numeric(12,2),
  clientes int,
  leads_contatados int,
  propostas int,
  updated_at timestamptz not null default now()
);
alter table public.metas enable row level security;
