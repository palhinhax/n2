# Nacional 2 — Documento de contexto do projeto

> Documento de referência para dar a um assistente de IA (ex. ChatGPT) todo o
> contexto necessário sobre este projeto, para pedir ajuda com código, ideias,
> textos ou decisões. Última atualização: julho de 2026.

---

## 1. O que é o Nacional 2

O **Nacional 2** é um **marketplace de carros usados em Portugal, 100% gratuito**
para quem anuncia (particulares e stands). O nome é uma homenagem à Estrada
Nacional 2 (a mais longa de Portugal, de Chaves a Faro).

A proposta de valor: **anunciar carros sem comissões nem custos**, com uma
"garagem digital" onde o utilizador guarda os seus carros (à venda ou não), com
lembretes de IPO, seguro e manutenção, ofertas diretas entre comprador e
vendedor, e uma grande oferta de inventário graças à agregação de anúncios de
outros portais.

Diferenciadores principais:

- **Gratuito para sempre** para quem publica.
- **Garagem digital** com lembretes (IPO, manutenção, seguro, IUC, pneus).
- **Agregação de mercado**: além dos anúncios próprios, o site mostra também
  anúncios recolhidos automaticamente de OLX, Standvirtual e Pisca Pisca, para
  ter desde o início uma base de inventário grande.
- **Perfis de stand** com página pública, logótipo, horário e contactos.
- **Favoritos com alerta de mudança de preço**.

---

## 2. Stack tecnológica

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Base de dados:** PostgreSQL (Neon) com Prisma ORM (`@prisma/client` 5.x)
  - Em desenvolvimento começou em SQLite; migrou-se para Postgres/Neon.
- **Autenticação:** Auth.js / NextAuth v5 (beta) com provider de credenciais
  (email + password, hash com bcryptjs)
- **Estado no cliente:** TanStack React Query
- **UI:** Tailwind CSS + alguns componentes shadcn/ui; design próprio com tema
  "quente" (tons creme/clay/olive). Fontes locais (Geist).
- **Armazenamento de imagens:** Backblaze B2 (API compatível com S3), via
  `@aws-sdk/client-s3`. Upload feito **pelo servidor** (o browser envia o
  ficheiro para `/api/upload` e o servidor entrega ao B2 — evita CORS).
- **Scraping:** scripts TypeScript executados com `tsx`.
- **Deploy previsto:** Vercel (com Vercel Cron para o scraping).

---

## 3. Estrutura do projeto (pastas principais)

```
app/                     # App Router (páginas + rotas de API)
  api/                   # endpoints
  carros/                # listagem e detalhe de carros
  eletricos/             # página dedicada a elétricos
  garagem/               # garagem do utilizador (CRUD dos seus carros)
  conta/                 # definições de conta
  stand/[id]/            # perfil público de stand
  favoritos/             # favoritos do utilizador
  admin/                 # painel de administração
components/              # componentes React (client e server)
lib/                     # utilitários (prisma, auth, b2, car-listing, hours, favorites…)
scripts/scraper/         # motor de scraping (adapters por site)
prisma/                  # schema.prisma + seed.ts
```

---

## 4. Modelo de dados (Prisma / PostgreSQL)

Modelos principais em `prisma/schema.prisma`:

- **User** — utilizadores. Campos: `name`, `email` (único), `passwordHash`,
  `role` (`USER`|`ADMIN`), `phone`, `district`. Perfil/conta:
  `accountType` (`PARTICULAR`|`STAND`), `avatarUrl` (foto/logo), `bio`,
  `address`, `postalCode`, `city`, e (stands) `standName`, `nif`, `website`,
  `hours` (horário semanal em JSON). Relações: `cars`, `offers`, `favorites`,
  `posts`.
- **Brand** / **Model** — marcas e modelos de carros (catálogo). O scraper
  regista automaticamente marcas/modelos novos aqui (normalizados).
- **Car** — carro de um utilizador. Campos: `brandId`, `modelId`, `version`,
  `year`, `km`, `fuel`, `gearbox`, `power`, `evRange` (autonomia WLTP),
  `color`, `description`, `district`, `forSale`, `price`, `negotiable`,
  `status` (`GARAGE`|`PENDING`|`APPROVED`|`REJECTED`). Relações: `photos`,
  `offers`, `reminders`, `views`, `favorites`.
- **Photo** — foto de um carro (`key`, `url`, `position`).
- **Offer** — oferta de um comprador a um carro (`amount`, `message`, `status`).
- **Reminder** — lembrete de um carro (`type`, `title`, `dueDate`, `done`).
- **CarView** — visualização única (por `visitorHash` via cookie) para contar
  visitantes distintos.
- **Favorite** — favorito/"like". **Polimórfico**: aponta para um `Car` (site)
  OU um `ScrapedListing` (externo). Guarda `priceWhenSaved` e `seenPrice` para
  detetar e notificar mudanças de preço.
- **ScrapedListing** — anúncio recolhido de um site externo. Campos:
  `source` (`OLX`|`STANDVIRTUAL`|`PISCAPISCA`), `externalId`, `url`, `title`,
  `brand`, `model`, `year`, `km`, `fuel`, `gearbox`, `power`, `displacement`,
  `price`, `location`, `sellerType`, `sellerName`, `imageUrls` (JSON de URLs),
  `active` (deixou de aparecer no site → false). Detalhe enriquecido:
  `description`, `equipment` (JSON), `color`, `doors`, `seats`, `drivetrain`,
  `bodyType`, `condition`, `registrationDate`, `warranty`, `co2`,
  `detailsFetchedAt`.
- **ScrapeState** — estado/cursor do scraper (para retomar entre execuções).
- **Post** — modelo genérico (herdado do template, pouco usado).

---

## 5. Funcionalidades já implementadas

### Utilizadores e conta

- Registo e login (email + password).
- Página de **definições** (`/conta`): tipo de conta (particular/stand), foto de
  perfil ou logótipo, telefone, morada/código postal/localidade, distrito, bio,
  e para stands: nome comercial, NIF, website e **horário semanal** (editor por
  dia, com períodos manhã/tarde e dias fechados). Também permite **mudar a
  palavra-passe**.
- **Perfil público de stand** (`/stand/[id]`): logo, contactos, website,
  horário formatado, bio e todos os carros à venda do stand.

### Carros e garagem

- **Garagem** (`/garagem`): lista dos carros do utilizador, com totais gerais
  (visualizações únicas, favoritos, ofertas).
- **Adicionar carro** (`/garagem/novo`) e **editar** (`/garagem/[id]/editar`):
  todos os campos + gestão de fotos (adicionar/remover).
- **Gestão de um carro** (`/garagem/[id]`): totais do anúncio, colocar/retirar
  de venda, ofertas recebidas, lembretes, editar, apagar.
- **Moderação**: um carro colocado à venda fica `PENDING` até um admin aprovar
  (`APPROVED`) — só então fica visível publicamente.

### Listagem e pesquisa

- **/carros**: listagem combinada dos carros do site + anúncios externos, com
  **scroll infinito** (API `/api/carros` pagina de 24 em 24), filtros
  automáticos (aplicam ao mudar, sem botão) por marca, modelo, preço, combustível,
  caixa, ano, km, e ordenação (recentes, preço, km).
  - As marcas/modelos nos filtros juntam os do catálogo com os que vêm do
    scraping (deduplicados; "VW"→"Volkswagen").
- **/eletricos**: página dedicada só a elétricos — sem filtro de combustível, e
  marcas/modelos só de carros elétricos.
- **Cards**: badge de combustível com cor e ícone (⚡ elétrico azul, 🔌 plug-in,
  🍃 híbrido, 🛢️ diesel, ⛽ gasolina, 💨 GPL). Os cards externos são
  indistinguíveis dos próprios (a origem só se revela na página de detalhe).
- **Detalhe** de carro do site (`/carros/[id]`) e de anúncio externo
  (`/carros/externo/[id]`, com galeria completa, equipamento, e botão "Ver
  anúncio original").

### Favoritos e notificações

- **Coração** para guardar em cards e páginas de detalhe (funciona para carros
  do site **e** anúncios externos). Contagem pública = quantas pessoas guardaram.
- **/favoritos**: lista dos carros guardados; se o preço mudou desde a última
  visita, mostra badge "▼ Baixou / ▲ Subiu de preço" com o valor antigo → novo.
- **Badge no header**: contador de favoritos com mudança de preço por ver.

### Ofertas e lembretes

- Comprador pode fazer **ofertas** diretas num carro; vendedor vê as ofertas
  recebidas na gestão do carro.
- **Lembretes** por carro (IPO, manutenção, seguro, IUC, pneus).

### Inteligência de compra e alertas (julho 2026)

- **Histórico do anúncio**: cada anúncio (externo e do site) regista todos os
  preços observados (`PricePoint`). A página de detalhe mostra "à venda há X
  dias", nº de mudanças de preço com linha temporal, e deteção de
  **republicação** (mesmo carro noutro anúncio removido da mesma fonte).
- **Alertas inteligentes**: cron diário (`/api/cron/alerts`) cria
  **notificações in-app** (`/notificacoes`, sino no header) para descidas de
  preço nos favoritos e carros novos nas pesquisas guardadas. Envia **email**
  via Resend se `RESEND_API_KEY` estiver definida (caso contrário, só in-app).
  Idempotente via `Favorite.notifiedPrice` e `SavedSearch.notifiedCount`.
- **Relatório de compra** na página de detalhe: custos anuais estimados
  (combustível/energia, IUC, seguro, manutenção — com pressupostos explícitos),
  valor esperado a 3/5 anos, link para recalls (Safety Gate UE), e "problemas
  conhecidos do modelo" gerados por IA e **cacheados por marca+modelo+fuel**
  (`ModelReport`, TTL 180 dias — ~1 chamada de IA por modelo, não por visita).
- **IA para o vendedor**: botão "✨ Gerar descrição com IA" nos formulários da
  garagem (`/api/ai/descricao`, límite diário `AI_DAILY_LIMIT_DESCREVER`,
  default 10/dia).

### Administração (`/admin`, só role ADMIN)

- Moderação de anúncios pendentes; lista de utilizadores.
- **Painel de scraping**: estatísticas por fonte, correr lotes de scraping a
  partir do browser, e comandos de terminal prontos a copiar.
- Botão "atualizar detalhes" nos anúncios externos (re-busca à origem).

---

## 6. O scraping (agregação de mercado)

Objetivo: encher o site com inventário recolhendo anúncios de **OLX,
Standvirtual e Pisca Pisca**.

- Código em `scripts/scraper/`, com um **adapter por site**:
  - **Standvirtual** — lê o JSON `__NEXT_DATA__` das páginas (Next.js SSR).
  - **OLX** — usa a API JSON interna; divide o universo em bandas de preço para
    contornar o limite de ~1000 resultados por pesquisa.
  - **Pisca Pisca** — HTML server-side, percorrido marca a marca.
- O progresso (cursor por fonte) é guardado em `ScrapeState`, por isso o
  scraping pode ser interrompido e retomado — essencial para correr por lotes na
  Vercel.
- **Ciclo a cada 3 dias**: rota `/api/cron/scrape` (agendada em `vercel.json`).
  Anúncios que desaparecem da origem ficam `active = false` (nunca apagados).
- **Imagens**: guardam-se apenas as **URLs** (hotlink dos CDNs de origem), não
  se descarregam ficheiros.
- **Enriquecimento sob demanda**: os detalhes (descrição, equipamento, todas as
  fotos, cor, portas, etc.) são recolhidos da página de origem só quando alguém
  abre o anúncio pela primeira vez, e guardados em cache (`detailsFetchedAt`).
- O scraper regista automaticamente marcas/modelos novos na tabela `Brand`/
  `Model` (com normalização).
- Comando local: `npx tsx scripts/scraper/run.ts` (flags: `--site`,
  `--max-pages`, `--reset`).

### Nota legal / ética importante

O scraping é usado para agregação **com atribuição**: cada anúncio externo tem um
selo discreto da fonte e um botão "Ver anúncio original". **Não** se republicam
os contactos pessoais dos vendedores (telefone/email) — isso seria uma violação
de RGPD. As imagens são hotlink com crédito à origem. O objetivo a prazo é ter
inventário próprio (onboarding de stands/particulares) em vez de depender do
scraping.

---

## 7. Rotas de API principais

- `POST /api/auth/register`, `[...nextauth]` — registo e sessão.
- `GET/POST /api/cars`, `PATCH/DELETE /api/cars/[id]` — CRUD de carros.
- `POST /api/cars/[id]/view` — regista visualização.
- `GET /api/carros` — listagem paginada combinada (scroll infinito).
- `GET/POST /api/favorites` — IDs e toggle de favoritos (carros e externos).
- `PATCH /api/account`, `POST /api/account/password` — perfil e password.
- `POST /api/upload` — upload de imagem (servidor → Backblaze B2).
- `GET /api/brands` — catálogo de marcas/modelos.
- `POST /api/offers`, `.../reminders` — ofertas e lembretes.
- Admin: `/api/admin/scrape`, `/api/admin/cars/[id]`,
  `/api/admin/listings/[id]/refresh`.
- Cron: `GET /api/cron/scrape` (protegido por `CRON_SECRET`).

---

## 8. Variáveis de ambiente (.env)

- `DATABASE_URL` — Postgres (Neon), pooled.
- `AUTH_SECRET`, `NEXTAUTH_URL` — Auth.js.
- `B2_ENDPOINT`, `B2_REGION`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`,
  `B2_PUBLIC_URL` — Backblaze B2.
- `CRON_SECRET` — protege as rotas de cron (scraping e alertas).
- `SCRAPE_DELAY_MS`, `SCRAPE_INTERVAL_DAYS`, `SCRAPE_BATCH_PAGES` — scraping.
- `OPENAI_API_KEY`, `OPENAI_MODEL` — funcionalidades de IA (chat, avaliação,
  descrição de anúncio, relatório de modelo).
- `RESEND_API_KEY`, `EMAIL_FROM` — emails de alerta (opcional; sem key, os
  alertas ficam só in-app).
- `AI_DAILY_LIMIT_CHAT`, `AI_DAILY_LIMIT_AVALIAR`, `AI_DAILY_LIMIT_DESCREVER`
  — limites diários de IA por utilizador.

---

## 9. Comandos úteis

```bash
npm run dev            # servidor de desenvolvimento
npm run build          # build de produção
npm run typecheck      # verificação de tipos TypeScript
npx prisma db push     # aplica o schema à BD
npx prisma generate    # gera o cliente Prisma
npx prisma studio      # UI para ver/editar a BD
npm run db:seed        # popula marcas/modelos (e dados demo)
npx tsx scripts/scraper/run.ts   # corre o scraping (ver flags acima)
```

---

## 10. Estado atual, limitações e próximos passos

**Funciona / feito:** contas (particular/stand), garagem com CRUD e fotos,
listagem com scroll infinito e filtros, página de elétricos, favoritos (site +
externos) com alertas de preço, perfis de stand com horário, ofertas, lembretes,
moderação, painel admin, scraping dos 3 sites com enriquecimento.

**Limitações conhecidas / pendentes:**

- O bucket B2 é privado — as imagens carregadas pelos utilizadores podem não
  aparecer publicamente sem tornar o bucket público ou servir via URLs
  assinadas de leitura (a decidir).
- Depois de mudanças ao schema é preciso correr `prisma db push` + `generate` e
  reiniciar o dev.
- O scraping depende da estrutura atual dos sites; se um site mudar o layout, o
  adapter respetivo precisa de ajuste.
- Parser do Pisca Pisca é o mais heurístico (texto), pode falhar campos.

**Ideias/planeadas:** onboarding de stands para inventário próprio; mostrar
nome/logo do stand nos cards e ligar ao perfil; notificações mais ricas;
melhorias de SEO; possivelmente app/PWA.

---

## 11. Como pedir ajuda a um assistente com este documento

Cola este documento no início da conversa e depois descreve o que precisas.
Exemplos de pedidos úteis:

- "Com base neste contexto, ajuda-me a escrever os Termos e Condições e a
  Política de Privacidade adequados a um agregador de carros em Portugal."
- "Sugere melhorias de UX para a página de listagem de carros."
- "Ajuda-me a definir a estratégia de SEO para páginas de marca/modelo."
- "Revê a arquitetura do scraping e sugere como escalar sem ser bloqueado."
- "Escreve textos de marketing / posts para redes sociais sobre o Nacional 2."

Quando pedires ajuda com **código**, indica também a stack (Next.js 14 App
Router, Prisma/Postgres, Tailwind, Auth.js v5) para o assistente dar respostas
compatíveis.
