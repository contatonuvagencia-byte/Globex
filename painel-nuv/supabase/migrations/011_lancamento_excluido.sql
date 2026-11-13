-- Lançamento automático (mensalidade, conta fixa, serviço) excluído fica marcado em vez de apagado,
-- para não ser recriado na próxima geração do mês.
alter table public.fin_lancamentos add column if not exists excluido boolean not null default false;
