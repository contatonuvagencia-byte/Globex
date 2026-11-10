-- Calendários de conteúdo lidos do Notion (antes ficavam fixos no código).
-- "auto" = encontrado sozinho nas páginas de clientes ativos; "manual" = colado pelo link.
create table if not exists public.calendarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  database_id text not null unique check (database_id ~ '^[0-9a-f]{32}$'),
  titulo_notion text,
  cor text not null default '#6250d6',
  campos jsonb not null,
  ativo boolean not null default true,
  origem text not null default 'manual' check (origem in ('auto','manual')),
  created_at timestamptz not null default now()
);
alter table public.calendarios enable row level security;

insert into public.calendarios (nome, database_id, titulo_notion, cor, campos, origem) values
  ('Globex', 'f3e57bd0e43f42bc94506a876afc5de2', '📦 Calendário Editorial — Globex Cargo', '#2a78d6',
   '{"titulo":"Título","data":"Data de Publicação","formato":"Formato","rede":"Plataforma","status":"Status","pilar":"Pilar"}', 'manual'),
  ('Beawst', '73a07ce018a783dda547011ac12a71e5', 'GESTÃO DE MÍDIAS - Beawst', '#eb6834',
   '{"titulo":"Head","data":"Data de veiculação","formato":"Formato","rede":"Rede social","etapa":"Etapa","arquivos":"Arquivos e mídia","referencias":"Referências","checks":{"conteudo":"Conteúdo/legenda","arte":"Arte/gravação","aprovacao":"Aprovação do cliente","postado":"Programado/Postado"}}', 'manual'),
  ('SINAIT', '2b907ce018a781cfac81f13f1d78c402', 'GESTÃO DE MÍDIAS - SINAIT', '#1baf7a',
   '{"titulo":"Head","data":"Data de veiculação","rede":"Rede social","etapa":"Etapa","referencias":"Referências","checks":{"conteudo":"Conteúdo/legenda","arte":"Arte/gravação","aprovacao":"Aprovação do cliente","postado":"Programado/Postado"}}', 'manual')
on conflict (database_id) do nothing;

-- Link público do relatório para o cliente (sem login). Nulo = não compartilhado.
alter table public.metricas_relatorios add column if not exists token_publico text unique;
alter table public.metricas_relatorios add column if not exists publicado_em timestamptz;
