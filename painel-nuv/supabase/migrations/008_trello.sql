-- Artes do Trello: quadro de cada calendário (vazio = acha pelo nome do cliente)
-- e o card escolhido à mão para um post, quando a busca automática não acerta.
alter table public.calendarios add column if not exists trello_board text;

create table public.trello_vinculos (
  post_id text primary key,   -- id da página do post no Notion
  card_id text,               -- id do card no Trello (null = "sem card")
  atualizado_em timestamptz not null default now()
);
alter table public.trello_vinculos enable row level security;
