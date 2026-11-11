-- Equipe: cada pessoa com login próprio e um perfil de acesso.
-- permissoes: { "calendario": "editar" | "ver" | "nenhum", "demandas": ..., "metricas": ..., "leads": ..., "servicos": ..., "financeiro": ... }
-- clientes: se preenchido, a pessoa só vê esses clientes (calendário, demandas e métricas).
create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 1 and 80),
  email text not null,
  senha_hash text not null,
  papel text not null default 'personalizado',
  permissoes jsonb not null default '{}',
  clientes text[] not null default '{}',
  ativo boolean not null default true,
  ultimo_acesso timestamptz,
  created_at timestamptz not null default now()
);
create unique index usuarios_email_idx on public.usuarios (lower(email));
alter table public.usuarios enable row level security;
