# Painel NUV

Um lugar só para:

- **Calendário unificado**: os posts de Globex, Beawst e SINAIT, lidos ao vivo do Notion. Clique num dia para ver o que sai, e clique num post para ver a **arte, a copy e a legenda** (com botão de copiar).
- **Métricas**: envie prints ou o PDF do painel do Instagram/TikTok/LinkedIn. O Claude lê os números, monta a planilha comparando com o período anterior, aponta o que deu certo e o que deu errado e sugere os próximos passos. Você confere, salva e baixa em **Excel (.xlsx)**.
- **Financeiro**: entradas e saídas, mensalidades automáticas por cliente com aviso de atraso, contas fixas que se repetem todo mês, lucro, margem, gráfico de 6 meses e receita por cliente.

## De onde vêm os posts

| Cliente | Banco no Notion | Data usada |
|---|---|---|
| Globex | 📦 Calendário Editorial — Globex Cargo | Data de Publicação |
| Beawst | GESTÃO DE MÍDIAS - Beawst | Data de veiculação |
| SINAIT | GESTÃO DE MÍDIAS - SINAIT | Data de veiculação |

A legenda e a copy são lidas **do corpo da página do post**:

- seção com título contendo "Legenda" → **Legenda**
- seção com "Slides", "Copy", "Roteiro" ou "Telas" → **Copy da arte**
- imagens/vídeos colados na página e o campo "Arquivos e mídia" → **Arte**
- as demais seções (Objetivo, Mecânica, Fontes...) aparecem como notas

Para incluir um cliente novo, adicione um bloco em `lib/clients.ts` com o ID do banco e o nome dos campos.

## Como colocar no ar (cerca de 20 minutos)

### 1. Notion
1. Acesse https://www.notion.so/my-integrations e clique em **Nova integração** (tipo *Interna*, só leitura de conteúdo já basta).
2. Copie o **token** (começa com `ntn_`).
3. No Notion, abra a página **NUVDash**, clique em `•••` → **Conexões** → adicione a integração. As páginas filhas (os clientes) herdam o acesso.

### 2. Supabase (financeiro + relatórios)
1. Use um projeto do Supabase (pode ser um novo, ex.: `painel-nuv`).
2. Em **SQL Editor**, cole e rode o arquivo `supabase/migrations/001_painel_nuv.sql`.
3. Em **Settings → API**, copie a **URL** e a chave **service_role**. A service_role é secreta e fica só no servidor.

### 3. Claude API (leitura dos prints)
Crie uma chave em https://platform.claude.com. Cada relatório gerado custa alguns centavos de dólar.

### 4. Vercel
1. Importe o repositório na Vercel e defina **Root Directory = `painel-nuv`**.
2. Em **Environment Variables**, preencha as variáveis de `.env.example`:
   `APP_PASSWORD`, `AUTH_SECRET`, `NOTION_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.
3. Faça o deploy e acesse com a senha definida em `APP_PASSWORD`.

> A leitura dos prints pode levar cerca de 1 minuto. No plano gratuito da Vercel as funções param em 60 s, então para relatórios com muitos prints o ideal é o plano Pro, ou enviar menos arquivos por vez.

## Rodar no computador

```bash
cd painel-nuv
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000
```

## Segurança

- Todo o painel exige login, inclusive as rotas `/api`.
- As chaves do Notion, do Supabase e do Claude ficam só no servidor.
- As tabelas do Supabase têm RLS ligado e nenhuma policy pública: só o painel acessa.
