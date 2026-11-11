-- Fotos de perfil (imagem pequena, 256px, guardada como data URL) e responsável nas demandas que se repetem.
create table public.avatares (
  usuario_id text primary key,            -- id do usuário ou "dona" (administração)
  imagem text not null check (length(imagem) < 300000),
  atualizado_em timestamptz not null default now()
);
alter table public.avatares enable row level security;

alter table public.demandas_recorrentes add column if not exists responsavel text;
-- No Notion, o banco "Minha Semana Produtiva - NUV" ganhou a coluna "Responsável" (seleção).
