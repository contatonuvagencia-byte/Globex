# NUV Leads

Sistema de prospecção da Agência NUV. Ele guarda os leads com nota de qualificação, gera mensagens
personalizadas (modelo + IA no tom da NUV) e acompanha o funil com follow-up automático.

**Stack:** React + Vite (front) · Supabase (banco, login, Edge Function) · Claude API (mensagens com IA).

## Como funciona

| Tela | O que faz |
|---|---|
| **Pipeline** | Quadro (kanban) ou lista. Arraste o lead entre etapas: Novo → Contatado → Respondeu → Reunião → Proposta → Fechado / Perdido. Filtros por nicho, nota e busca. |
| **Ficha do lead** | Diagnóstico, o que a NUV pode fazer, mensagem por canal (WhatsApp, Direct, e-mail), botão de IA, histórico de contatos e todos os dados. |
| **Follow-ups** | Quem precisa de um toque hoje (atrasados primeiro) e os leads quentes ainda não abordados. |
| **Importar** | Cole JSON ou CSV. Duplicados (mesmo nome + cidade) são ignorados. |
| **Mensagens** | Modelos por nicho/canal com variáveis `{empresa}`, `{categoria}`, `{bairro}`, `{diagnostico}`, `{diagnostico_curto}`, `{oportunidade}`. |

### Nota de qualificação (0–100)
Calculada no banco a cada alteração:
- Instagram **inexistente/parado**: 30 · **fraco**: 22 · ativo: 5 · não verificado: 10
- **Sem site**: 25 · site fraco: 15 · não verificado: 8
- Porte **grande**: 30 · **médio**: 22 · pequeno: 5 · não verificado: 10
- Mais de 1 unidade: +5 · 100+ avaliações no Google: +7 (30+: +4) · nota ≥ 4,5: +3

70+ = quente (azul) · 45–69 = morno (preto) · abaixo = frio.

### Follow-up automático
- **Marcar como enviado** num lead *Novo*: registra no histórico, move para *Contatados* e agenda follow-up em **3 dias**.
- Em leads já contatados: registra e agenda o próximo toque em **4 dias**.
- Mudar para *Respondeu* agenda em 2 dias; para *Proposta*, em 4 dias. *Fechado/Perdido* limpa o follow-up.

## Pesquisa de leads com o Claude

Abra uma sessão do Claude Code neste repositório (com o conector Supabase ativo) e peça, por exemplo:

> Pesquisa 20 clínicas de estética de médio porte em BH com Instagram fraco ou sem site e importa no NUV Leads.

O Claude pesquisa, preenche diagnóstico + oportunidade e insere direto na tabela `leads` do projeto
Supabase `nuv-leads`. Se preferir, ele te entrega um JSON para colar em **Importar**.

Campos que vale preencher: `name, niche (saude|b2b|institucional|outro), category, neighborhood, phone,
whatsapp, email, website, site_status, instagram, ig_status, ig_followers, google_rating, google_reviews,
maps_url, size, units, diagnosis, opportunity, notes, source`.

> **Atenção:** não prospectar despachantes aduaneiros, que são concorrentes diretos da Globex Cargo (cliente).

## Configuração (uma vez só)

1. **Chave da IA:** Supabase → projeto `nuv-leads` → Edge Functions → Secrets → adicionar
   `ANTHROPIC_API_KEY` (gerada em console.anthropic.com). Sem ela, os modelos de mensagem funcionam normalmente;
   só o botão "Gerar/Refinar com IA" fica indisponível.
2. **Publicar na Vercel:** em vercel.com → Add New Project → importar este repositório → **Root Directory: `nuv-leads`**
   → Deploy. As variáveis já estão no arquivo `.env` (são chaves públicas).
3. **Liberar o login:** Supabase → Authentication → URL Configuration → em **Site URL** coloque a URL da Vercel
   (ex.: `https://nuv-leads.vercel.app`) e adicione a mesma URL em **Redirect URLs**.
4. **Equipe:** só e-mails na tabela `team_members` acessam os dados. Para incluir alguém:
   ```sql
   insert into team_members (email, name) values ('pessoa@email.com', 'Nome');
   ```

## Rodar localmente
```bash
cd nuv-leads
npm install
npm run dev   # http://localhost:5173 (adicione essa URL em Redirect URLs do Supabase)
```

## Estrutura
```
nuv-leads/
  src/App.tsx                 layout, login, dados e ações do funil
  src/components/             Pipeline, LeadDrawer, Followups, ImportView, TemplatesView, Login
  src/lib/                    tipos, cliente Supabase, utilitários (modelos, WhatsApp, CSV)
  supabase/functions/gerar-mensagem/   Edge Function de IA (Claude)
  supabase/migrations/        schema do banco (já aplicado)
```
