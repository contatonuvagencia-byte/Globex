-- Serviços freela (área de membros, landing page, e-book, arte, vídeo, Notion).
-- Cada serviço gera sozinho os recebimentos no financeiro (fin_lancamentos com origem 'servico').
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('area_membros','landing_page','ebook','arte','video','notion')),
  titulo text,
  cliente text not null check (length(cliente) between 1 and 160),
  contato text,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  custo numeric(12,2) not null default 0 check (custo >= 0),
  pagamento text not null default 'avista' check (pagamento in ('avista','sinal','parcelado')),
  parcelas int not null default 1 check (parcelas between 1 and 24),
  forma_pagamento text,
  data_inicio date not null default current_date,
  prazo date,
  entregue_em date,
  status text not null default 'andamento' check (status in ('orcamento','andamento','entregue','cancelado')),
  observacoes text,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index servicos_status_idx on public.servicos (status, created_at desc);
alter table public.servicos enable row level security;

-- um serviço pode ter várias parcelas no mesmo mês (ex.: sinal e restante)
alter table public.fin_lancamentos add column if not exists parcela int not null default 1;
alter table public.fin_lancamentos drop constraint fin_lancamentos_origem_check;
alter table public.fin_lancamentos add constraint fin_lancamentos_origem_check check (origem in ('manual','mensalidade','recorrente','servico'));
alter table public.fin_lancamentos drop constraint fin_lancamentos_origem_origem_id_competencia_key;
alter table public.fin_lancamentos add constraint fin_lancamentos_origem_unica unique (origem, origem_id, competencia, parcela);
create index if not exists fin_lancamentos_origem_idx on public.fin_lancamentos (origem, origem_id);
