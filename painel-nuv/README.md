# Painel NUV

Um lugar só para tocar a agência:

- **Calendário unificado**: os posts de todos os clientes, lidos ao vivo do Notion. Clique num post para ver **arte, copy e legenda** e **marcar como postado** (grava no Notion).
- **Calendários automáticos**: cliente novo marcado como *Ativo* em CLIENTES no Notion, com um banco “Gestão de Mídias” (o do template), aparece sozinho. Também dá para colar o link de qualquer banco em *Gerenciar calendários*.
- **Métricas**: envie prints ou PDF do painel do Instagram/TikTok/LinkedIn. O Claude lê os números, monta a planilha comparativa e escreve o que deu certo, o que deu errado e os próximos passos. Baixe em **Excel** ou gere a **versão do cliente**: um link com a identidade da NUV (ou o arquivo **HTML**) para mandar.
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

## Como colocar no ar

### 1. Notion
1. Em https://www.notion.so/my-integrations, crie uma integração **interna** com as capacidades **Ler conteúdo** e **Atualizar conteúdo**.
2. Copie o token (começa com `ntn_`).
3. No Notion, abra a página **NUVDash** → `•••` → **Conexões** → adicione a integração. Tudo dentro dela (clientes, calendários) herda o acesso.

### 2. Supabase
Em **Project Settings → API Keys** do projeto *painel-nuv*, copie a chave **service_role** (secreta, só no servidor).

### 3. Claude API
Crie uma chave em https://platform.claude.com. Ela lê os prints de métricas e escreve as mensagens de prospecção.

### 4. Vercel
1. Importe o repositório na Vercel com **Root Directory = `painel-nuv`**.
2. Em **Environment Variables**, preencha as variáveis de `.env.example`.
3. Faça o deploy e entre com a senha de `APP_PASSWORD`.

> A leitura de prints leva cerca de 1 minuto. No plano gratuito da Vercel as funções param em 60 s; para relatórios com muitos prints, use o plano Pro ou envie menos arquivos por vez.

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
- As chaves do Notion, do Supabase e do Claude ficam só no servidor.
- As tabelas têm RLS ligado. As do painel não têm nenhuma policy pública; as de leads mantêm as policies da equipe do nuv-leads.
