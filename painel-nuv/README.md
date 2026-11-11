# Painel NUV

Um lugar só para tocar a agência:

- **Calendário unificado**: os posts de todos os clientes, lidos ao vivo do Notion. Clique num post para ver **arte, copy e legenda** e **marcar como postado** (grava no Notion).
- **Calendários automáticos**: cliente novo marcado como *Ativo* em CLIENTES no Notion, com um banco “Gestão de Mídias” (o do template), aparece sozinho. Também dá para colar o link de qualquer banco em *Gerenciar calendários*.
- **Métricas**: leve os prints para o seu Claude com o pedido pronto e cole a resposta, ou digite os números. O painel monta a planilha comparativa, calcula as variações e organiza o que deu certo, o que deu errado e os próximos passos. Baixe em **Excel** ou gere a **versão do cliente**: um link com a identidade da NUV (ou o arquivo **HTML**) para mandar.
- **Demandas**: as tarefas de “Minha Semana Produtiva - NUV” agrupadas por cliente ou na semana, com atrasadas e prioridades. Concluir, mudar data/prioridade/status e criar demanda gravam direto no Notion.
- **Leads**: funil de prospecção (trazido do nuv-leads), ficha do lead, histórico de contatos, modelos de mensagem, mensagem escrita pela IA e follow-ups do dia.
- **Financeiro**: entradas, saídas, mensalidades automáticas por cliente (com aviso de atraso), contas fixas, lucro, margem e gráfico de 6 meses.

## Banco de dados

Projeto Supabase **painel-nuv** (São Paulo): `https://goxtzswosdtmfpblergv.supabase.co`.
As migrações em `supabase/migrations/` já foram aplicadas. Os 18 leads, 11 modelos e a equipe vieram do projeto nuv-leads (conferido: conteúdo idêntico). O nuv-leads continua funcionando até você decidir pausá-lo.

## Como o painel lê cada post do Notion

A legenda e a copy vêm **do corpo da página do post**:

- seção com título contendo “Legenda” → **Legenda**
- seção com “Slides”, “Copy”, “Roteiro” ou “Telas” → **Copy da arte**
- imagens/vídeos colados na página e o campo de arquivos → **Arte**
- as demais seções (Objetivo, Mecânica, Fontes...) aparecem como notas

“Marcar como postado” marca o checkbox *Programado/Postado* (Beawst, SINAIT e o template) ou troca o *Status* para *Publicado* (Globex).

## Custo: R$ 0

| Peça | Plano | Custo |
|---|---|---|
| Netlify (hospedagem) | Free, permite uso comercial | grátis |
| Supabase (banco) | Free | grátis |
| Notion (integração) | qualquer plano | grátis |
| IA | o seu Claude (claude.ai), copiando e colando | grátis |

A API paga do Claude é **opcional**. Sem ela, nas Métricas você usa “Usar meu Claude (grátis)” ou “Digitar os números”; nos Leads, o botão “Copiar pedido para o Claude”. Se um dia colocar `ANTHROPIC_API_KEY`, o painel passa a ler os prints e escrever as mensagens sozinho.

## Como colocar no ar

### 1. Notion
1. Em https://www.notion.so/profile/integrations, crie uma integração **interna** com as capacidades **Ler conteúdo**, **Atualizar conteúdo** e **Inserir conteúdo** (para criar demandas).
2. Copie o token (começa com `ntn_`).
3. No Notion, abra a página **NUVDash** → `•••` → **Conexões** → adicione a integração.

### 2. Supabase
No projeto *painel-nuv*, em **Project Settings → API Keys**, copie a chave **service_role** (aba *Legacy API keys*) ou a **Secret key** (`sb_secret_...`).

### 3. Netlify
1. Entre em https://app.netlify.com com o GitHub.
2. **Add new project → Import an existing project → GitHub → Globex**.
3. Em **Branch to deploy**, escolha `claude/dreamy-babbage-s0kzdq`. O resto (pasta `painel-nuv`, comando de build) vem do `netlify.toml`.
4. Em **Environment variables**, adicione `APP_PASSWORD`, `AUTH_SECRET`, `NOTION_TOKEN`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
5. **Deploy**. O endereço fica algo como `nome.netlify.app` (dá para mudar em *Site configuration → Change site name*).

## Rodar no computador

```bash
cd painel-nuv
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000
```

## Segurança

- Todo o painel exige login, inclusive as rotas `/api`.
- A única exceção é `/r/<código>`: o link do relatório que você gera para o cliente. O código é aleatório e pode ser desativado a qualquer momento.
- As chaves do Notion e do Supabase ficam só no servidor.
- As tabelas têm RLS ligado. As do painel não têm nenhuma policy pública; as de leads mantêm as policies da equipe do nuv-leads.
