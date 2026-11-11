"""Gera as páginas do site SINAIT DS/MG (index.html, convenios.html, noticias.html).
Para atualizar notícias ou convênios, edite as listas abaixo e rode: python3 build.py
"""
from html import escape

TEL = "(31) 99339-0116"
TEL_LINK = "https://wa.me/5531993390116"
ENDERECO = "Av. Augusto de Lima, 479, sala 1007, Centro, Belo Horizonte, MG, 30190-005"
INSTAGRAM = "https://www.instagram.com/sinaitmg/"
FACEBOOK = "https://www.facebook.com/people/DSMG-Sinait/61561180918312/"
FILIAR = "https://www.sinait.org.br/filiar"
PETICAO = "https://secure.avaaz.org/community_petitions/po/presidente_da_republica_criacao_de_1_800_cargos_de_auditores_fiscais_do_trabalho_para_proteger_a_dignidade_laboral/"

NOTICIAS = [
    ("noticia-01", "31 jan 2026", "Dia da criação da Auditoria-Fiscal do Trabalho. Onde há direitos, há fiscalização", "", "SINAIT", "https://track.sinait.org.br/views/pt-br/Mzk0MDk0OQ==/a3741584f4f7a902b3dd6c9f24abcac4bce81/h/9f2e07273cbf77152471b7c048490cb1/u/Nzk1MDgxMA=="),
    ("noticia-02", "31 jan 2026", "Apagão no combate ao trabalho escravo: operações canceladas deixam ao menos 78 denúncias sem fiscalização, dizem auditores", "", "g1", "https://g1.globo.com/trabalho-e-carreira/noticia/2026/01/27/apagao-no-combate-ao-trabalho-escravo.ghtml"),
    ("noticia-03", "31 jan 2026", "Memória, justiça e compromisso: por que a chacina de Unaí não pode ser esquecida", "", "Diário do Aço", "https://www.diariodoaco.com.br/noticia/0131093-memoria-justica-e-compromisso-por-que-a-chacina-de-unai-nao-pode-ser-esquecida"),
    ("noticia-04", "31 jan 2026", "SINAIT lembra os mortos da Chacina de Unaí com ato em frente ao Ministério do Trabalho", "", "Revista Proteção", "https://protecao.com.br/noticias/geral/sinait-lembra-os-mortos-da-chacina-de-unai-com-ato-em-frente-ao-ministerio-do-trabalho/"),
    ("noticia-05", "31 jan 2026", "Pilhas de rejeito não são barragens, mas representam risco à sociedade", "", "Diário do Aço", "https://www.diariodoaco.com.br/noticia/0130956-pilhas-de-rejeito-nao-sao-barragens-mas-representam-risco-a-sociedade"),
    ("noticia-06", "29 out 2025", "A autonomia da Auditoria-Fiscal do Trabalho não pode ser violada", "O ministro do Trabalho decidiu avocar a competência sobre autuações feitas por Auditores-Fiscais contra a JBS Aves, suspendendo a inclusão da empresa na “lista suja”. Uma medida atípica, que abre um precedente perigoso para a autonomia da Inspeção do Trabalho.", "Diário PcD", "https://diariopcd.com.br/a-autonomia-da-auditoria-fiscal-do-trabalho-nao-pode-ser-violada/"),
    ("noticia-07", "29 out 2025", "MG: mais de cem menores de idade são resgatados de fábricas de calçados", "Operação coordenada pela Auditoria-Fiscal do Trabalho fiscalizou 68 fábricas em Perdigão e Nova Serrana, no Centro-Oeste de Minas Gerais.", "Estado de Minas", "https://www.em.com.br/gerais/2025/09/7259800-mg-mais-de-cem-menores-de-idade-sao-resgatados-de-fabricas-de-calcados.html"),
    ("noticia-08", "28 set 2025", "Como a fiscalização trabalhista transforma a inclusão de PcDs", "A Lei de Cotas, aliada à fiscalização trabalhista, é um pilar fundamental para um mercado de trabalho mais justo.", "Estado de Minas", "https://www.em.com.br/opiniao/2025/09/amp/7253016-como-a-fiscalizacao-trabalhista-transforma-a-inclusao-de-pcds.html"),
    ("noticia-09", "28 set 2025", "A urgência da prevenção ao suicídio", "Setembro é marcado pela cor amarela, símbolo de uma campanha que joga luz sobre um tema sensível, mas que precisa ser debatido.", "O Tempo", "https://www.otempo.com.br/opiniao/2025/9/11/a-urgencia-da-prevencao-ao-suicidio"),
    ("noticia-10", "28 set 2025", "Memorial Brumadinho: lembrança, reflexão e responsabilidade", "Uma experiência que nos coloca frente a frente com a memória da dor e com a responsabilidade de impedir que novos desastres se repitam.", "Hoje em Dia", "https://www.hojeemdia.com.br/opiniao/opiniao/memorial-brumadinho-lembranca-reflex-o-e-responsabilidade-1.1083284"),
    ("noticia-11", "28 set 2025", "Trabalho digno: 30 anos depois", "O enfrentamento ao trabalho escravo e a promoção do trabalho decente permanecem desafios centrais para o Brasil.", "BH em Pauta", "https://bhempauta.com/artigo-trabalho-digno-30-anos-depois/"),
    ("noticia-12", "28 set 2025", "Situação análoga à escravidão no norte de Minas", "Reportagem do Jornal BandMinas, a partir dos 11 minutos.", "BandMinas", "https://www.youtube.com/watch?v=d7vx3jJwPT8"),
]

CONVENIOS = [
    dict(img="conv-affemg", nome="AFFEMG + FUNDAFFEMG", curto="Plano de saúde",
         beneficio="Convênios comerciais e plano de saúde por autogestão FUNDAFFEMG.",
         inclui=["Plano de saúde com atendimento personalizado", "Telefonia, odontologia e seguros", "Eventos culturais e hospedagens"],
         como=["Acesse www.fundaffemg.com.br", "Vá até a seção “FUNDAFFEMG MANUAIS”", "Ou tire dúvidas pelo WhatsApp"],
         tel="(31) 2103-5858", botoes=[("Acessar o site", "https://www.fundaffemg.com.br/")]),
    dict(img="conv-rockfeller", nome="Escola de Inglês Rockfeller", curto="25% de desconto",
         beneficio="25% de desconto nas mensalidades.",
         inclui=["Unidades Barreiro, Fernão Dias, Prado e Itapoã/Planalto"],
         como=["Informe sua filiação no ato da matrícula", "Escolha a unidade de sua preferência", "Comece as aulas com desconto"],
         tel="(31) 99951-5801", botoes=[("Ligar", "tel:+5531999515801")]),
    dict(img="conv-pertim", nome="Estacionamento Pertim, Aeroporto de Confins", curto="15% de desconto",
         beneficio="15% de desconto no estacionamento rotativo.",
         inclui=["Antigo pátio da Localiza, Rod. LMG 800, s/n, km 04, Confins/MG"],
         como=["Apresente seu CPF no guichê de entrada", "O sistema identifica a filiação e aplica o desconto"],
         tel="(31) 99069-9009", botoes=[("Visitar o site", "https://pertimbhpark.com.br/")]),
    dict(img="conv-wellhub", nome="Wellhub", curto="Academias e bem-estar",
         beneficio="A maior plataforma de academias, aulas online, meditação, terapia e muito mais.",
         inclui=["Disponível pelo app"],
         como=["Baixe o app Wellhub", "Selecione o SINAIT como empresa parceira", "Informe o e-mail cadastrado no sindicato e escolha seu plano"],
         tel="", botoes=[("App Store", "https://apps.apple.com/br/app/gympass/id703761434"), ("Google Play", "https://play.google.com/store/apps/details?id=com.gympass&hl=pt_br")]),
    dict(img="conv-pardini", nome="Hermes Pardini", curto="Até 35% em exames",
         beneficio="Descontos de até 35% em exames, em todas as unidades, com documento de identificação.",
         inclui=["Imagem (exceto Pet Scan)", "Check-up e consultas", "Análises clínicas e anatomia patológica", "Vacinas e genética"],
         como=["Apresente seu documento de identificação na unidade"],
         tel="4004-7808", botoes=[("Entrar em contato", "tel:+553140047808")]),
    dict(img="conv-casa-do-porto", nome="Casa do Porto", curto="Vinhos e pratos",
         beneficio="10% de desconto em vinhos. Em datas específicas do restaurante, ao pedir um prato o filiado ganha outro de igual ou menor valor.",
         inclui=[], como=["Apresente seu documento de identificação"], tel="", botoes=[]),
]

ICON_IG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'
ICON_FB = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z"/></svg>'
SETA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def head(titulo, descricao):
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{escape(titulo)}</title>
<meta name="description" content="{escape(descricao)}">
<meta property="og:title" content="{escape(titulo)}">
<meta property="og:description" content="{escape(descricao)}">
<meta property="og:image" content="img/noticia-06.jpg">
<meta name="theme-color" content="#200100">
<link rel="icon" href="img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="styles.css">
</head>
<body>"""


def topo(atual):
    def item(href, nome, chave):
        cur = ' aria-current="page"' if chave == atual else ""
        return f'<a href="{href}"{cur}>{nome}</a>'
    return f"""
<header class="topo">
  <div class="container">
    <a class="marca" href="index.html" aria-label="SINAIT DS/MG, página inicial"><img src="img/logo.png" alt="SINAIT DS/MG"></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <nav class="menu" id="menu" aria-label="Principal">
      {item("index.html", "Início", "inicio")}
      {item("index.html#sobre", "Quem somos", "sobre")}
      {item("convenios.html", "Convênios", "convenios")}
      {item("noticias.html", "Notícias", "noticias")}
      {item("index.html#contato", "Contato", "contato")}
      <span class="redes-topo"><a href="{INSTAGRAM}" target="_blank" rel="noopener" aria-label="Instagram">{ICON_IG}</a><a href="{FACEBOOK}" target="_blank" rel="noopener" aria-label="Facebook">{ICON_FB}</a></span>
      <a class="btn btn-laranja" href="{FILIAR}" target="_blank" rel="noopener">Quero me filiar</a>
    </nav>
  </div>
</header>
<main>"""


def rodape():
    return f"""
</main>
<section class="filie" id="filie">
  <div class="container">
    <div>
      <h2 class="display">Fortaleça a Auditoria-Fiscal do Trabalho</h2>
      <p>Filie-se ao SINAIT e tenha acesso a convênios exclusivos, representação e informação de quem atua em defesa do trabalho digno.</p>
    </div>
    <a class="btn btn-escuro" href="{FILIAR}" target="_blank" rel="noopener">Quero me filiar {SETA}</a>
  </div>
</section>
<footer class="rodape" id="contato">
  <div class="container">
    <div>
      <img src="img/logo.png" alt="SINAIT DS/MG">
      <p>Delegacia Sindical do SINAIT em Minas Gerais. Representamos e fortalecemos os Auditores-Fiscais do Trabalho.</p>
    </div>
    <div>
      <h4>Contato</h4>
      <ul>
        <li><a href="{TEL_LINK}" target="_blank" rel="noopener">{TEL} (WhatsApp)</a></li>
        <li>{ENDERECO}</li>
      </ul>
    </div>
    <div>
      <h4>Navegue</h4>
      <ul>
        <li><a href="convenios.html">Convênios</a></li>
        <li><a href="noticias.html">Notícias</a></li>
        <li><a href="http://sinait.org.br/" target="_blank" rel="noopener">SINAIT nacional</a></li>
        <li><a href="{INSTAGRAM}" target="_blank" rel="noopener">Instagram @sinaitmg</a></li>
        <li><a href="{FACEBOOK}" target="_blank" rel="noopener">Facebook</a></li>
      </ul>
    </div>
    <div class="base"><span>© 2026 SINAIT DS/MG. Todos os direitos reservados.</span><span>Sindicato Nacional dos Auditores Fiscais do Trabalho</span></div>
  </div>
</footer>
<script>
  const btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  btn.addEventListener('click', () => {{ const a = menu.classList.toggle('aberto'); btn.setAttribute('aria-expanded', a); }});
  menu.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {{ menu.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); }}));
</script>
</body>
</html>
"""


def card(n):
    img, data, titulo, resumo, fonte, url = n
    resumo_html = f"<p>{escape(resumo)}</p>" if resumo else ""
    return f"""<a class="card" href="{escape(url)}" target="_blank" rel="noopener" data-busca="{escape((titulo + ' ' + resumo + ' ' + fonte).lower())}">
      <div class="img"><img src="img/{img}.jpg" alt="" loading="lazy"></div>
      <div class="corpo"><span class="data">{data}</span><h3>{escape(titulo)}</h3>{resumo_html}<span class="fonte">Fonte: {escape(fonte)}</span><span class="ler">Ler a matéria →</span></div>
    </a>"""


def index():
    parceiros = "".join(
        f'<a class="parceiro" href="convenios.html#{c["img"]}"><img src="img/{c["img"]}.jpg" alt="" loading="lazy"><span><b>{escape(c["nome"].split(",")[0])}</b><small>{escape(c["curto"])}</small></span></a>'
        for c in CONVENIOS)
    return head("SINAIT DS/MG · Auditores-Fiscais do Trabalho em Minas Gerais",
                "Delegacia Sindical do SINAIT em Minas Gerais: notícias, convênios exclusivos e ações em defesa dos Auditores-Fiscais do Trabalho.") + topo("inicio") + f"""
<section class="hero">
  <img class="hero-foto" src="img/noticia-06.jpg" alt="Auditor-Fiscal do Trabalho com colete da Auditoria em fiscalização">
  <div class="container">
    <span class="selo">Delegacia Sindical de Minas Gerais</span>
    <h1 class="display">Compromisso com<br><span class="faixa">direitos e dignidade</span></h1>
    <p>Em defesa dos direitos dos trabalhadores e da valorização da Auditoria-Fiscal do Trabalho.</p>
    <div class="acoes">
      <a class="btn btn-laranja" href="{FILIAR}" target="_blank" rel="noopener">Quero me filiar {SETA}</a>
      <a class="btn btn-contorno" href="convenios.html">Ver convênios</a>
    </div>
  </div>
</section>

<section class="bloco" id="sobre">
  <div class="container sobre">
    <div>
      <span class="eyebrow">Quem somos</span>
      <h2 class="display">SINAIT <span class="faixa">Minas Gerais</span></h2>
      <p>Somos a Delegacia Sindical do SINAIT em Minas Gerais, a entidade que representa e fortalece os Auditores-Fiscais do Trabalho. Aqui você encontra informações sobre nossa atuação, serviços, convênios exclusivos e ações em prol da valorização da categoria.</p>
      <ul class="pilares">
        <li>Representação da categoria em Minas Gerais</li>
        <li>Convênios exclusivos para filiados</li>
        <li>Defesa da autonomia da Inspeção do Trabalho</li>
      </ul>
    </div>
    <div class="foto"><img src="img/noticia-07.jpg" alt="Auditora-Fiscal do Trabalho em fiscalização" loading="lazy"></div>
  </div>
</section>

<section class="bloco" style="padding-top:0">
  <div class="container">
    <div class="cabeca">
      <div><span class="eyebrow">Notícias SINAIT/MG</span><h2 class="display">Na <span class="faixa">mídia</span></h2></div>
      <p>Matérias, notícias e atualizações sobre a atuação do sindicato. Informação com credibilidade e compromisso com os Auditores-Fiscais do Trabalho.</p>
    </div>
    <div class="grade">{"".join(card(n) for n in NOTICIAS[:3])}</div>
    <p style="text-align:center;margin:40px 0 0"><a class="btn btn-escuro" href="noticias.html">Ver todas as notícias {SETA}</a></p>
  </div>
</section>

<section class="bloco escuro">
  <div class="container">
    <div class="cabeca">
      <div><span class="eyebrow" style="color:var(--laranja-claro)">Convênios exclusivos</span><h2 class="display">Benefícios para <span class="faixa">filiados</span></h2></div>
      <p>Descontos, serviços especiais e benefícios pensados para quem atua na Auditoria-Fiscal do Trabalho.</p>
    </div>
    <div class="parceiros">{parceiros}</div>
    <p style="margin:40px 0 0"><a class="btn btn-laranja" href="convenios.html">Conhecer todos os convênios {SETA}</a></p>
  </div>
</section>

<section class="bloco">
  <div class="container duo">
    <a class="destaque" href="{PETICAO}" target="_blank" rel="noopener">
      <img src="img/home-peticao.jpg" alt="" loading="lazy">
      <div class="txt"><span class="eyebrow" style="color:var(--laranja-claro)">Petição</span><h3 class="display">Pela criação de 2.000 cargos de Auditor-Fiscal do Trabalho</h3><p>Mais auditores significa mais proteção à dignidade de quem trabalha. Assine e compartilhe.</p><span class="btn btn-laranja">Assinar a petição {SETA}</span></div>
    </a>
    <a class="destaque" href="http://sinait.org.br/" target="_blank" rel="noopener">
      <img src="img/noticia-04.jpg" alt="" loading="lazy">
      <div class="txt"><span class="eyebrow" style="color:var(--laranja-claro)">SINAIT nacional</span><h3 class="display">Fique por dentro de tudo do SINAIT Brasil</h3><p>Notícias, campanhas e posicionamentos do Sindicato Nacional dos Auditores Fiscais do Trabalho.</p><span class="btn btn-contorno">Acessar sinait.org.br {SETA}</span></div>
    </a>
  </div>
</section>
""" + rodape()


def convenios():
    blocos = []
    for c in CONVENIOS:
        inclui = f'<div><h3>Inclui</h3><ul>{"".join(f"<li>{escape(i)}</li>" for i in c["inclui"])}</ul></div>' if c["inclui"] else ""
        como = f'<div><h3>Como utilizar</h3><ol>{"".join(f"<li>{escape(i)}</li>" for i in c["como"])}</ol></div>'
        botoes = "".join(f'<a class="btn btn-laranja" href="{escape(u)}" target="_blank" rel="noopener">{escape(t)}</a>' for t, u in c["botoes"])
        tel = f'<span class="tel">Informações: {escape(c["tel"])}</span>' if c["tel"] else ""
        acoes = f'<div class="acoes">{botoes}{tel}</div>' if (botoes or tel) else ""
        blocos.append(f"""<article class="convenio" id="{c['img']}">
      <div class="img"><img src="img/{c['img']}.jpg" alt="" loading="lazy"></div>
      <div class="info"><h2 class="display">{escape(c['nome'])}</h2><span class="beneficio">{escape(c['beneficio'])}</span><div class="colunas">{inclui}{como}</div>{acoes}</div>
    </article>""")
    return head("Convênios · SINAIT DS/MG", "Convênios exclusivos para filiados da DS/SINAIT-MG: saúde, educação, bem-estar, estacionamento e mais.") + topo("convenios") + f"""
<section class="pagina-topo">
  <div class="container">
    <span class="eyebrow" style="color:var(--laranja-claro)">Exclusivo para filiados</span>
    <h1 class="display">Convênios <span class="faixa">SINAIT</span></h1>
    <p>Como filiado ao SINAIT, você tem acesso a uma rede de convênios exclusivos que tornam seu dia a dia mais leve: descontos, serviços especiais e benefícios pensados para quem atua na Auditoria-Fiscal do Trabalho.</p>
  </div>
</section>
<section class="bloco">
  <div class="container">
    <div class="lista-convenios">{"".join(blocos)}</div>
    <div class="clube" style="margin-top:40px">
      <div><span class="eyebrow" style="color:var(--laranja-claro)">Clube SINAIT</span><h2 class="display">Benefícios em todo o Brasil</h2><p>Baixe o app do Clube SINAIT e acesse convênios nacionais em diversas áreas.</p></div>
      <div class="acoes">
        <a class="btn btn-laranja" href="https://apps.apple.com/br/app/clube-sinait/id1472100723" target="_blank" rel="noopener">App Store</a>
        <a class="btn btn-contorno" href="https://play.google.com/store/apps/details?id=club.sinait.mobile.associations&hl=pt_BR" target="_blank" rel="noopener">Google Play</a>
      </div>
    </div>
    <div class="nota">
      <span class="eyebrow">Aproveite seus benefícios</span>
      <h2 class="display">Você <span class="faixa">merece!</span></h2>
      <p>Na DS/SINAIT-MG, valorizamos quem luta por justiça no dia a dia. Esses convênios são mais do que vantagens: são reconhecimento ao seu trabalho, dedicação e compromisso com a sociedade.</p>
      <p>Fique atento: em breve, novos convênios serão divulgados por aqui. Dúvidas ou sugestões? Fale com a gente pelo WhatsApp <a href="{TEL_LINK}" target="_blank" rel="noopener"><b>{TEL}</b></a>.</p>
    </div>
  </div>
</section>
""" + rodape()


def noticias():
    return head("Notícias · SINAIT DS/MG", "Notícias e artigos da DS/SINAIT-MG na imprensa: trabalho escravo, Unaí, inclusão, saúde e segurança no trabalho.") + topo("noticias") + f"""
<section class="pagina-topo">
  <div class="container">
    <span class="eyebrow" style="color:var(--laranja-claro)">DS-MG/SINAIT na mídia</span>
    <h1 class="display">Nossas últimas <span class="faixa">notícias</span></h1>
    <p>Matérias, artigos e reportagens sobre a atuação da Auditoria-Fiscal do Trabalho e do sindicato em Minas Gerais e no Brasil.</p>
  </div>
</section>
<section class="bloco">
  <div class="container">
    <div class="busca"><label class="sr" for="q" style="position:absolute;left:-9999px">Buscar notícias</label><input id="q" type="search" placeholder="Buscar por tema, como Unaí, escravo, PcD..."><span class="contador" id="contador">{len(NOTICIAS)} notícias</span></div>
    <div class="grade" id="lista">{"".join(card(n) for n in NOTICIAS)}</div>
    <p class="vazio" id="vazio">Nenhuma notícia encontrada para essa busca.</p>
  </div>
</section>
<script>
  const q = document.getElementById('q'), cards = [...document.querySelectorAll('#lista .card')];
  const norm = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  q.addEventListener('input', () => {{
    const t = norm(q.value.trim()); let n = 0;
    cards.forEach(c => {{ const ok = !t || norm(c.dataset.busca).includes(t); c.hidden = !ok; if (ok) n++; }});
    document.getElementById('contador').textContent = n + (n === 1 ? ' notícia' : ' notícias');
    document.getElementById('vazio').style.display = n ? 'none' : 'block';
  }});
</script>
""" + rodape()


for nome, fn in [("index.html", index), ("convenios.html", convenios), ("noticias.html", noticias)]:
    open(nome, "w", encoding="utf-8").write(fn())
print("ok")
