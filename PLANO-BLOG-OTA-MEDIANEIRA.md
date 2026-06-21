# Blueprint Editorial — Blog Advertorial OTA Odontologia (Medianeira-PR)

> **Objetivo:** transformar o blog da OTA em um ativo de SEO + GEO (rankeamento em IAs)
> que constrói **desejo, autoridade e conversão** por meio de artigos em formato
> **advertorial**, com depoimentos e CTA iguais aos do site principal. Foco geográfico:
> **Medianeira-PR e microrregião**.
>
> **Decisões já tomadas pelo cliente:**
> - **Domínio canônico do blog:** `otaodontologia.com.br/blog/`
> - **Volume da 1ª onda:** Dominação (24+ artigos)
> - **Produção:** via pipeline de skills (adaptado para OTA) + validação automática (sem gate humano por artigo)

---

## 1. Contexto e diagnóstico

**Quem é o cliente.** Dr. Mozar Paloschi (CRO 21106/PR), 15 anos de atuação, especialista em
**prótese dentária e implantodontia**. Clínica **OTA — Odontologia de Alta Tecnologia**
(Av. Brasil, 2415 — Centro, Medianeira-PR). Diferenciais reais: **planejamento digital
(scanner 3D / "ver o sorriso no computador antes de começar"), laboratório próprio,
resultado em até 48h, microscópio, raio-X na hora**. Provas: 10.000+ sorrisos refeitos,
4.000+ implantes.

**Público (ICP).** Adultos **50+**, classe média/média-alta, que: evitam sorrir em fotos;
já fizeram trabalho dentário ruim e querem refazer; têm prótese que solta/machuca; perderam
dentes; têm vergonha de falar de perto. Linguagem **simples**, acolhedora, sem jargão.

**Já existe base no repositório (não recomeçar do zero):**
- Homepage: `mozar/index.html` — voz, CTA, escassez dinâmica, 32 depoimentos em vídeo, 3 em texto.
- Blog: `mozar/blog/index.html` (índice) + `mozar/blog/implante-dentario-medianeira/` (1 artigo informacional — será **elevado a pilar advertorial**).
- 3 páginas comerciais: `implante-dentario-medianeira/`, `lente-contato-dental-medianeira/`, `reabilitacao-oral-medianeira/`.
- `sitemap.xml` (7 URLs), design system (tokens OTA), assets de fotos e vídeos.

**Diagnóstico de SEO local (pesquisa real — jun/2026):**
- A SERP de "implante dentário Medianeira" é **competitiva mas pobre em conteúdo**:
  dominada por franquias (Sorridents, Oral Unic, OdontoTop, Ortoplan) e fichas Facebook —
  páginas finas, sem cluster informacional. **Oportunidade clara** para autoridade via conteúdo.
- ⚠️ **Fragmentação de domínio (resolver):** aparecem nas buscas `otaodontologia.com.br`
  **e** `odontologiaota.com.br`, além de `mateusrucci.com.br/mozar/` e
 . Isso **dilui autoridade**.
  Ver §8 (ação: consolidar com 301 para o canônico).
- **Geografia:** Medianeira tem 54.369 hab. (IBGE 2022), microrregião de Foz do Iguaçu.
  Cidades-satélite (raio curto, sem clínica de alta complexidade própria): **Serranópolis do
  Iguaçu, Matelândia, São Miguel do Iguaçu, Missal** (limítrofes) + Céu Azul, Itaipulândia,
  Ramilândia, Santa Terezinha de Itaipu. Esse é o **cluster geográfico** a capturar.

---

## 2. Estratégia em uma frase

> Construir, no domínio `otaodontologia.com.br/blog/`, uma **biblioteca pilar→cluster** de
> advertoriais que responde **todas as perguntas** que um paciente 50+ de Medianeira e região
> faz antes de decidir — cada artigo provando autoridade (Dr. Mozar + tecnologia), inserindo
> **depoimentos reais** no meio e fechando com o **mesmo CTA do site** (avaliação gratuita no
> WhatsApp + escassez) — estruturada para o **Google E as IAs** citarem a OTA como a referência local.

---

## 3. Arquitetura SEO + GEO

### 3.1 Modelo Pilar → Cluster (topical authority)

Quatro **hubs** (pilares) concentram autoridade; cada **cluster** responde uma pergunta/intenção
e linka de volta ao pilar e à página comercial correspondente.

| Pilar (hub) | Página comercial ligada | Nº de clusters |
|---|---|---|
| **P1. Implantes dentários** | `/mozar/implante-dentario-medianeira/` | 7 |
| **P2. Lentes & estética do sorriso** | `/mozar/lente-contato-dental-medianeira/` | 7 |
| **P3. Reabilitação oral / recuperar o sorriso** | `/mozar/reabilitacao-oral-medianeira/` | 4 |
| **P4. Confiança, decisão & diferencial OTA** | homepage + depoimentos | 4 |
| **Geo (cidades vizinhas)** | pilar/serviço relevante | 4–8 |

### 3.2 SEO local (on-page)

- **Cidade na estrutura:** no `<title>`, H1, primeiro parágrafo, slug (nos pilares e geo), alt
  da imagem, e em `areaServed` do schema. Em clusters de pergunta, a cidade entra no título/corpo
  (não no slug, para não poluir a keyword da dúvida).
- **NAP consistente** (Nome, Endereço, Telefone) idêntico em todo schema e rodapé.
- **Linkagem interna:** cada artigo tem ≥3 links internos (pilar + irmão + serviço). Pilares
  linkam para todos os seus clusters.

### 3.3 GEO — rankear nas IAs (AI Overviews, ChatGPT/Claude/Perplexity Search)

Tática concreta embutida no **template**:
1. **Snapshot extraível:** o 1º parágrafo de cada H2 responde a pergunta direto (2–4 frases),
   funcionando sozinho — é o que IA e featured snippet citam.
2. **FAQ com schema `FAQPage`** + headings em forma de pergunta (casam com "People Also Ask"
   e com perguntas conversacionais às IAs).
3. **Dados citáveis com atribuição** ("estudos de longo prazo mostram 95–98% de sucesso em 10
   anos") — IA prefere afirmações verificáveis. Nunca inventar número.
4. **Clareza de entidade:** `Person` (Dr. Mozar, com `sameAs` → Instagram/Google) + `Dentist`
   (OTA, NAP + `areaServed`) repetidos e idênticos — a IA entende "quem/onde".
5. **Estrutura escaneável:** listas, tabelas comparativas, definições curtas.
6. **Frescor:** `dateModified` atualizado; revisitar trimestral.
7. **Liberar crawlers de IA** no `robots.txt` (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot,
   Google-Extended) — sem isso, a IA não pode citar.
8. **`llms.txt`** na raiz: resumo da entidade + lista das páginas-chave.
9. **Cobertura total do cluster:** quando a OTA responde *todas* as variações, vira a fonte que
   a IA puxa para a região.

> **Fora do repositório, porém essencial para IA/Maps local:** Google Business Profile 100%
> preenchido (categorias, fotos, avaliações), NAP idêntico em diretórios (citações). Sem isso,
> nenhum conteúdo coloca a clínica nas respostas locais. Ação para o cliente (§8).

### 3.4 Schema (dados estruturados) por tipo de página

| Página | JSON-LD |
|---|---|
| Todo artigo | `Article` (+ `MedicalWebPage` quando clínico) + `BreadcrumbList` + `FAQPage` |
| `author` | `Person` "Dr. Mozar Paloschi", `sameAs` Instagram/Google |
| `publisher` | `Dentist` "OTA Odontologia" com `address` (NAP) + `areaServed` (Medianeira + vizinhas) + `telephone` |
| Opcional | `speakable` (trechos para assistentes de voz) |

> **Não** marcar depoimentos como `Review`/`aggregateRating` no próprio site (auto-avaliação
> viola diretriz de rich result do Google e o Código de Ética do CFO). Depoimentos entram como
> **prova social visível**, não como estrela de rich snippet.

---

## 4. Anatomia do TEMPLATE advertorial (todos os artigos seguem isto)

Ordem dos blocos — equilibra **editorial (advertorial)** com **SEO/GEO**:

1. **Kicker/eyebrow** — `Categoria · Medianeira, PR` (tópico + geo).
2. **H1** — keyword + benefício (ex.: *"Implante dentário em Medianeira: voltar a mastigar com segurança"*).
3. **Dek (subtítulo advertorial)** — o gancho de desejo/empatia (a "promessa").
4. **Linha de autoridade** — *Por Dr. Mozar Paloschi · CRO 21106/PR · data · X min* (E-E-A-T).
5. **Imagem hero** — foto do Dr. Mozar ou caso real (alt descritivo, WebP + fallback).
6. **Lead advertorial (abertura)** — problema → agitação → empatia, nomeando a dor do leitor 50+
   (puxada da seção "Dores" da home). 2–3 parágrafos curtos que prendem.
7. **Corpo (H2/H3)** — cada H2 abre com **snapshot** (resposta direta = GEO), educa e constrói
   autoridade. Keyword + secundárias naturais. Callouts ("Ponto central"), listas, **tabela
   comparativa** nos artigos de comparação.
8. **Prova social embutida (meio do artigo)** — bloco de **1–2 depoimentos em texto** (estilizado
   no CSS do blog) + **1 card de vídeo** (reaproveita `assets/depoimentos/dep-XX`), contextual ao
   tema. É a "batida de prova" do advertorial, **antes** do FAQ/CTA.
9. **Diferencial OTA (mecanismo único)** — planejamento digital, lab próprio, 48h, "ver antes de
   começar", 15 anos / 10.000 sorrisos / 4.000 implantes. Autoridade + porquê escolher a OTA.
10. **FAQ** — `<dl><dt><dd>` + schema `FAQPage` (perguntas reais do cluster).
11. **CTA (igual ao site)** — bloco escuro: headline + *"Minha Avaliação Gratuita"* → WhatsApp
    (`wa.me/5545991282260` com texto contextual ao artigo) + microcopy *"Você fala com uma pessoa
    de verdade · Sem compromisso"* + **banner de escassez** (`js-vagas`, reaproveitado da home).
12. **Box do autor** — Dr. Mozar Paloschi · CRO 21106/PR (E-E-A-T).
13. **Leituras relacionadas** — links internos (pilar + clusters irmãos + serviço).
14. **Footer** + barra de progresso de leitura (já existe no template do blog).

**Padrões fixos**
- **Voz:** simples, frases ≤25 palavras, parágrafos ≤4 linhas, zero jargão sem explicar, acolhedor.
- **Ortografia:** **acentuação correta** (o artigo legado está sem acentos — corrigir no padrão novo; UTF-8 já declarado, IAs e Google preferem texto correto).
- **CTA único** por artigo (dois CTAs competem). Sempre WhatsApp + avaliação gratuita.
- **Imagens:** fotos reais do Dr. e casos da pasta `assets/`. `alt` descritivo, sem keyword stuffing.
- **Canonical:** sempre `https://otaodontologia.com.br/blog/{slug}/` (ver §8).

**Metas de tamanho**
| Tipo | Palavras |
|---|---|
| Pilar (hub advertorial) | 1.800–2.500 |
| Cluster (dúvida/educacional) | 1.200–1.800 |
| Comparativo (com tabela) | 1.300–1.800 |
| Geo (cidade vizinha) | 900–1.300 |
| Emocional / topo de funil | 1.000–1.500 |

---

## 5. Mapa de temas — 29 artigos (1ª onda "Dominação")

Legenda intenção: **TOFU** topo (desejo/educação) · **MOFU** meio (comparação/decisão) ·
**BOFU** fundo (alta intenção de compra). Tipo: **ADV** advertorial-pilar · **INFO**
informacional-advertorial · **COMP** comparativo · **GEO** geográfico · **EMO** emocional.

### Pilar 1 — Implantes dentários
| # | Título (SEO) | Keyword-alvo | Slug | Intenção | Tipo |
|--|--|--|--|--|--|
| 1 | Implante dentário em Medianeira: o guia para voltar a mastigar com segurança | implante dentário medianeira | `implante-dentario-medianeira-guia` | BOFU | ADV (pilar) |
| 2 | Implante dentário dói? O que acontece antes, durante e depois | implante dentário dói | `implante-dentario-doi` | MOFU | INFO |
| 3 | Quanto tempo dura um implante dentário (e o que faz durar a vida toda) | quanto tempo dura implante | `quanto-tempo-dura-implante-dentario` | MOFU | INFO |
| 4 | Implante dentário depois dos 60: existe idade limite? | implante dentário idade/idoso | `implante-dentario-depois-dos-60` | MOFU | INFO |
| 5 | Diabético ou hipertenso pode fazer implante dentário? | implante diabético/hipertensão | `implante-dentario-diabetico-hipertenso` | MOFU | INFO |
| 6 | Enxerto ósseo para implante: quando é preciso e como funciona | enxerto ósseo dentário | `enxerto-osseo-implante-dentario` | MOFU | INFO |
| 7 | Dente no mesmo dia? Como funciona a carga imediata | implante carga imediata | `implante-carga-imediata-dente-no-mesmo-dia` | MOFU | INFO |
| 8 | Protocolo (dentes fixos) x dentadura: qual vale mais a pena | protocolo x dentadura | `protocolo-x-dentadura` | MOFU | COMP |

### Pilar 2 — Lentes & estética do sorriso
| # | Título (SEO) | Keyword-alvo | Slug | Intenção | Tipo |
|--|--|--|--|--|--|
| 9 | Lente de contato dental em Medianeira: sorriso natural, sem "dente postiço" | lente de contato dental medianeira | `lente-contato-dental-medianeira-guia` | BOFU | ADV (pilar) |
| 10 | Lente de contato dental dói? Precisa lixar o dente? | lente de contato dental dói | `lente-contato-dental-doi` | MOFU | INFO |
| 11 | Quanto custa lente de contato dental? Como avaliar o investimento | lente de contato dental preço | `quanto-custa-lente-contato-dental` | MOFU | INFO |
| 12 | Lente de porcelana x resina: qual escolher | lente porcelana x resina | `lente-porcelana-x-resina` | MOFU | COMP |
| 13 | Lente de contato dental dura quanto tempo? Cuidados que prolongam | durabilidade lente dental | `quanto-dura-lente-contato-dental` | MOFU | INFO |
| 14 | Por que algumas lentes ficam com aspecto "falso" (e como evitar) | lente dental natural/postiça | `lente-dental-natural-sem-aspecto-falso` | TOFU | ADV |
| 15 | Clareamento dental funciona? Antes ou depois das lentes? | clareamento dental | `clareamento-dental-medianeira` | MOFU | INFO |
| 16 | Ver o sorriso no computador antes de começar (projeto do sorriso) | projeto do sorriso / DSD | `projeto-do-sorriso-planejamento-digital` | TOFU | ADV (diferencial) |

### Pilar 3 — Reabilitação oral / recuperar o sorriso
| # | Título (SEO) | Keyword-alvo | Slug | Intenção | Tipo |
|--|--|--|--|--|--|
| 17 | Reabilitação oral em Medianeira: recuperar sorriso e mastigação | reabilitação oral medianeira | `reabilitacao-oral-medianeira-guia` | BOFU | ADV (pilar) |
| 18 | Prótese que solta e machuca? As opções fixas para parar de sofrer | prótese que solta / prótese fixa | `protese-que-solta-opcoes-fixas` | MOFU | INFO |
| 19 | Bruxismo e desgaste dos dentes: como reconstruir a mordida | desgaste dentário / bruxismo | `bruxismo-desgaste-reconstruir-mordida` | MOFU | INFO |
| 20 | Refazer trabalho dentário malfeito: o retratamento explicado | retratamento dentário | `retratamento-refazer-trabalho-dentario` | MOFU | ADV |
| 21 | Perdi quase todos os dentes — ainda tem solução? | reabilitação boca toda | `perdi-todos-os-dentes-tem-solucao` | TOFU | EMO |

### Pilar 4 — Confiança, decisão & diferencial OTA
| # | Título (SEO) | Keyword-alvo | Slug | Intenção | Tipo |
|--|--|--|--|--|--|
| 22 | Como escolher dentista para implante/lente em Medianeira: 8 perguntas | melhor dentista medianeira | `como-escolher-dentista-medianeira` | MOFU | ADV |
| 23 | Laboratório próprio e resultado em 48h: por que muda o seu tratamento | tratamento dentário rápido | `laboratorio-proprio-resultado-48h` | TOFU | ADV (diferencial) |
| 24 | Tecnologia na odontologia: scanner 3D, microscópio e raio-X na hora | odontologia digital / tecnologia | `tecnologia-odontologia-scanner-3d` | TOFU | ADV (diferencial) |
| 25 | Tenho vergonha de sorrir: o impacto e como recomeçar | vergonha de sorrir | `vergonha-de-sorrir-como-recomecar` | TOFU | EMO |

### Geo — cidades vizinhas (conteúdo rico, **não** doorway)
| # | Título (SEO) | Keyword-alvo | Slug | Intenção | Tipo |
|--|--|--|--|--|--|
| 26 | Dentista, implante e lente para quem é de São Miguel do Iguaçu | dentista são miguel do iguaçu | `dentista-implante-sao-miguel-do-iguacu` | BOFU | GEO |
| 27 | Implante e estética dental para quem é de Matelândia | dentista matelândia | `dentista-implante-matelandia` | BOFU | GEO |
| 28 | Implante e reabilitação para quem é de Serranópolis do Iguaçu | dentista serranópolis | `dentista-implante-serranopolis-do-iguacu` | BOFU | GEO |
| 29 | Odontologia estética e implantes para quem é de Missal | dentista missal | `dentista-implante-missal` | BOFU | GEO |

> **Risco de doorway page (Google penaliza):** páginas geo NÃO podem ser a mesma página com a
> cidade trocada. Cada uma precisa de conteúdo único: distância/rota até a OTA, por que pacientes
> da cidade procuram Medianeira, depoimento (idealmente de paciente da região), e o serviço.
> Se faltar substância única, **consolidar** em menos páginas ou em um hub "Atendemos a região".

**Expansão futura (onda 2, score menor — guardar):** "implante dentário parou de doer e voltou
a sorrir" (caso/depoimento longform), "mini implantes", "lente em dente da frente / fechar
diastema (espaço entre dentes)", "gengivoplastia / sorriso gengival", "prótese flexível x fixa",
+ geo Céu Azul, Itaipulândia, Santa Terezinha de Itaipu, Ramilândia.

---

## 6. Estrutura de URLs e arquivos

```
mozar/blog/{slug}/index.html          ← arquivo físico
→ https://otaodontologia.com.br/blog/{slug}/    (canônico)
→ https://mateusrucci.com.br/mozar/blog/{slug}/ (espelho, canonical aponta p/ OTA)
```
- Slug **sem acento**, keyword-led; cidade no slug só em pilares e geo.
- URL pública **nunca** termina em `index.html` (canonical, OG, breadcrumb, sitemap, links).
- Registrar cada artigo em `mozar/blog/index.html` (card) e `mozar/sitemap.xml`.

---

## 7. Compliance — Código de Ética Odontológica (CFO/CRO)

Regras embutidas no template e na checklist de review (não negociáveis):
- **Sem preço/promoção/desconto** como chamariz. Artigos de "preço" explicam **como avaliar o
  investimento** e citam faixas de mercado **com fonte** — nunca "na OTA custa R$ X".
- **Sem promessa/garantia de resultado** ("sorriso perfeito garantido" ✗). Usar "pode", "ajuda",
  "planejamento", "na maioria dos casos".
- **Sem sensacionalismo** e **sem desqualificar concorrentes** nominalmente.
- **Depoimentos:** manter autênticos (primeiro nome + inicial), sem promessa exagerada; recomendar
  **consentimento documentado** de imagem/texto. Evitar enquadrar como "antes e depois" que promete
  resultado.
- **Identificação profissional** sempre visível: Dr. Mozar Paloschi · CRO 21106/PR (box do autor).

---

## 8. Correções técnicas / SEO de base (antes/junto da 1ª onda)

| Item | O quê | Onde |
|---|---|---|
| **Canonical cross-domain** | `canonical` + `og:url` apontam para `https://otaodontologia.com.br/...` na fonte. No espelho mateusrucci, isso vira canonical cross-domain → consolida na OTA. `deploy-ota.sh` (sed) só reescreve `mateusrucci.com.br/mozar`→OTA, então não quebra. | todo `mozar/**.html` novo; retrofitar os existentes |
| **robots.txt** | Criar (hoje **não existe**). Liberar `/`, Googlebot, Bingbot e crawlers de IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended). Apontar sitemap. | `mozar/robots.txt` (deploy-ota leva p/ raiz OTA) |
| **llms.txt** | Criar: descrição da entidade OTA + lista de páginas-chave (para IAs). | `mozar/llms.txt` |
| **favicon** | Adicionar (hoje **ausente**). | `mozar/` + `<link rel=icon>` |
| **sitemap** | Adicionar cada novo artigo com `lastmod`. | `mozar/sitemap.xml` |
| **Consolidar domínios** *(fora do repo)* | Auditar e **301** `odontologiaota.com.br` → `otaodontologia.com.br`. | registrar/hosting |
| **Search Console + GBP** *(fora do repo)* | Verificar `otaodontologia.com.br` no Google Search Console + Bing; otimizar Google Business Profile (NAP idêntico). | contas Google |

---

## 9. Produção via pipeline de skills (adaptado para OTA)

As skills `blog-*` são **multi-cliente** (config em `references/clients/{slug}.md`). Hoje só
existe `rucci.md`. Criamos **`mozar.md`** em cada skill → pipeline OTA-ready.

| Skill | Uso para OTA | Observação |
|---|---|---|
| `blog-research` | Parcial | O motor HN/Reddit é para público B2B/tech — **não serve** p/ 50+ local. A pesquisa de SERP/dúvidas deste blueprint substitui. |
| `blog-brief` | Sim | Estrutura de brief (título, slug, meta, H2/H3, keyword, schema, CTA). |
| `blog-writer` | Sim (com ajuste) | Usa `mozar.md` para voz/CTA. **Atenção:** template HTML padrão da skill é genérico — usamos o **template OTA** (do blog atual) como gold-master. |
| `blog-review` | Sim | Checklist SEO+editorial, score ≥90. Acrescentar checagem de **compliance CFO** e de **canonical OTA**. |
| `blog-publish` | **Não** | Hard-coded para o blog do Mateus Rucci (`blog/` raiz, canonical `mateusrucci.com.br/blog/`, CTA `/diagnostico-personalizado/`, guard de repo). Para OTA, **publicar direto** em `mozar/blog/{slug}/` seguindo o padrão do artigo OTA existente. |

**Fluxo por artigo:** brief (estrutura) → writer (texto no template OTA) → review (auto, ≥90 +
compliance) → publish OTA (gravar em `mozar/blog/{slug}/`, registrar índice + sitemap).
Sem gate humano por artigo (decisão do cliente) — eu valido e sigo.

---

## 10. Rollout (ordem de produção)

1. **Base técnica** — robots.txt, llms.txt, favicon, fix de canonical no template. *(§8)*
2. **Gold-master:** flagship #1 (Pilar 1 — implante, art. 1) 100% pronto e validado = referência visual/estrutural.
3. **Pilares** #9 e #17 (lentes, reabilitação) + #22/#25 (autoridade/emocional) — espinha dorsal.
4. **Clusters** dos pilares 1–2 (maior volume de busca): #2–#8, #10–#16.
5. **Clusters** pilar 3 + diferenciais: #18–#21, #23–#24.
6. **Geo** ricos: #26–#29.
7. **Onda 2** (expansão) conforme performance no Search Console.

A cada lote: registrar no índice + sitemap, atualizar `dateModified`, conferir links internos.

---

## 11. Como medir (verificação)

- **Técnico:** Search Console (cobertura, impressões/cliques por query e por cidade), Rich
  Results Test (Article/FAQ válidos), PageSpeed.
- **GEO:** perguntar a ChatGPT/Claude/Perplexity/Google AI "implante dentário em Medianeira",
  "lente de contato dental Medianeira", "melhor dentista para reabilitação em Medianeira" e
  verificar se a OTA é citada — repetir mensalmente.
- **Conversão:** eventos de clique no CTA WhatsApp (gtag/pixel já existem) por artigo.
- **Ranking:** posição das keywords-alvo (acompanhar as BOFU primeiro).

---

### Apêndice A — Fontes da pesquisa (jun/2026)
- SERP local: clínicas concorrentes em Medianeira (Sorridents, Oral Unic, OdontoTop, Ortoplan, Prime, Conceito) + presença OTA/Paloschi.
- Espaço de dúvidas (implante: dói/dura/idade/osseointegração/enxerto; lente: preço/dói/durabilidade/desgaste/porcelana x resina) — validado em buscas e PAA.
- Geografia: IBGE (Medianeira 54.369 hab., microrregião Foz; limítrofes Serranópolis, Matelândia, São Miguel do Iguaçu, Missal).

### Apêndice B — Ativos reutilizáveis
- Depoimentos texto: Ana Paula M. (retratamento/lentes), Ricardo F. (reabilitação/bruxismo), Fernanda K. (lentes em 48h).
- Depoimentos vídeo: `assets/depoimentos/dep-01..32` (.jpg poster + .mp4).
- Fotos: Dr. Mozar `assets/08_opt.jpg` / `08_lcp_720.webp`; casos `01..10_opt.jpg`.
- CTA: `https://wa.me/5545991282260?text=...` · Escassez: `js-vagas` (Sáb–Seg 10 → Sex 2).
- Tokens: `--primary:#2A2A28 --secondary:#4A5E52 --accent:#C8A98A --paper:#FDFAF7 --line:#E2D8CE`.
```
