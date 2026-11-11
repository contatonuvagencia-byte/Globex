alter table public.propostas add column if not exists enviada_em timestamptz;
create index if not exists propostas_lead_idx on public.propostas (lead_id);
create index if not exists fin_clientes_lead_idx on public.fin_clientes (lead_id);
