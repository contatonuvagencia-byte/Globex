# Painel NUV

Um lugar só para tocar a agência:

- **Hoje** (tela inicial): posts do dia (com miniatura), não postados e aguardando aprovação, suas demandas de hoje e atrasadas, follow-ups e propostas abertas pelo cliente, o que receber e pagar, entregas de serviços, contratos para renovar e a meta do mês. Cada pessoa só vê os blocos que o perfil dela permite.
- **Clientes**: a ficha de cada cliente com contatos, serviços contratados, contrato (início, duração, aviso 30 dias antes de vencer e botão de renovar), mensalidade, pagamentos, posts do mês, demandas abertas, relatórios, serviços freela, briefing e acessos.
- **Comercial**: meta do mês com progresso (faturamento, novos clientes, leads contatados, propostas), funil de leads e **propostas com link** para o cliente abrir, aceitar ou recusar sem login. O painel avisa quando o cliente abriu, e o aceite fecha o lead sozinho. No lead, “Fechou! Virar cliente” cria a ficha e a mensalidade em um clique.
- **Calendário unificado**: os posts de todos os clientes, lidos ao vivo do Notion. Clique num post para ver **arte, copy e legenda** e **marcar como postado** (grava no Notion).
- **Calendários automáticos**: cliente novo marcado como *Ativo* em CLIENTES no Notion, com um banco “Gestão de Mídias” (o do template), aparece sozinho. Também dá para colar o link de qualquer banco em *Gerenciar calendários*.
- **Métricas**: leve os prints para o seu Claude com o pedido pronto e cole a resposta, ou digite os números. O painel monta a planilha comparativa, calcula as variações e organiza o que deu certo, o que deu errado e os próximos passos. Baixe em **Excel** ou gere a **versão do cliente**: um link com a identidade da NUV (ou o arquivo **HTML**) para mandar.
- **Demandas**: as tarefas de “Minha Semana Produtiva - NUV” agrupadas por cliente ou na semana, com atrasadas e prioridades. Concluir, mudar data/prioridade/status e criar demanda gravam direto no Notion. Demandas podem **se repetir** (todo dia, dias úteis, semanal, quinzenal, mensal): o painel cria os próximos cards sozinho e cada card pode ser editado à parte.
- **Serviços freela**: área de membros, landing page, e-book, arte, vídeo e Notion, com quem contratou, contato, valor, custo, prazo, status e observações. Cada serviço cria sozinho no **Financeiro** as entradas (à vista, sinal + entrega ou parcelado) e a saída do custo; marcar como recebido num lugar aparece no outro.
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

## Artes do Trello

Com `TRELLO_KEY` e `TRELLO_TOKEN` (grátis, só leitura; no Trello: power-ups/admin → sua integração → Autorização → **Autenticação do Trello** → chave e link “Token”; no Netlify: Site configuration → Environment variables), cada post do calendário mostra as imagens anexadas ao card do Trello com o título mais parecido, no quadro do cliente (achado pelo nome, ex.: "Calendário de aprovação - GLOBEX", ou escolhido em *Calendários*). Se a busca não acertar, “trocar card” deixa escolher o card certo e o painel lembra.


## Miniaturas e envio de artes

- O card do post no calendário mostra a arte em miniatura: primeiro a imagem do campo de arquivos do Notion; se não tiver, a do card do Trello; se não tiver, a primeira imagem dentro da página do post.
- No post aberto, **Anexar arte** (ou arrastar a imagem) envia o arquivo para o Notion e/ou para o card do Trello:
  - Notion: vai para o campo de arquivos do post se ele estiver vazio; senão, entra como imagem no fim da página. A integração do Notion precisa da capacidade **Inserir conteúdo** (notion.so/profile/integrations → sua integração → Capacidades).
  - Trello: anexa no card do post. O token precisa ser de **leitura e escrita**. Para gerar: `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&name=Painel%20NUV&key=SUA_CHAVE` (troque SUA_CHAVE pela TRELLO_KEY) e troque a TRELLO_TOKEN no Netlify.
  - Limite de 4,5 MB por arquivo (imagens maiores são reduzidas para 2160 px automaticamente). Vídeos grandes: envie direto no Notion/Trello.

## Equipe e perfis de acesso

Na aba **Equipe** (só a administração vê) você cadastra cada pessoa com e-mail e senha e escolhe um perfil:

| Perfil | O que faz |
|---|---|
| Administração | Tudo, inclusive Financeiro, Equipe e configuração de calendários |
| Social media | Edita Calendário, Demandas e Métricas |
| Design / vídeo | Vê o Calendário e edita Demandas |
| Comercial | Edita Leads e Serviços, vê o Calendário |
| Só visualizar | Vê tudo menos Financeiro, sem editar |
| Personalizado | Você escolhe área por área: sem acesso, só ver ou editar |

Também dá para limitar **quais clientes** a pessoa vê (Calendário, Demandas e Métricas). Desativar ou remover alguém corta o acesso em até 20 segundos.
A administração entra com o e-mail em branco e a `APP_PASSWORD`.

## Segurança

- Todo o painel exige login, inclusive as rotas `/api`. Cada rota confere o perfil da pessoa (área, nível e clientes) no servidor, não só na tela.
- Senhas da equipe são guardadas com scrypt; a sessão é um cookie assinado (HMAC) que vale 30 dias.
- A única exceção é `/r/<código>`: o link do relatório que você gera para o cliente. O código é aleatório e pode ser desativado a qualquer momento.
- As chaves do Notion e do Supabase ficam só no servidor.
- As tabelas têm RLS ligado. As do painel não têm nenhuma policy pública; as de leads mantêm as policies da equipe do nuv-leads.
