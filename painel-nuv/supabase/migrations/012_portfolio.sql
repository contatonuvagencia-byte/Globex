-- Portfólio: trabalhos da agência com arquivos no Storage (bucket público "portfolio", até 50 MB por arquivo).
create table if not exists public.portfolio_itens (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(titulo) between 1 and 160),
  cliente text,
  categoria text not null default 'Social media',
  descricao text,
  link text,
  arquivos jsonb not null default '[]',   -- [{ path, nome, tipo, tamanho, mini }]
  destaque boolean not null default false,
  publico boolean not null default true,  -- aparece na vitrine pública
  data date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portfolio_itens_cat_idx on public.portfolio_itens (categoria, created_at desc);
alter table public.portfolio_itens enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('portfolio', 'portfolio', true, 52428800)
on conflict (id) do nothing;
