# Scraper de carros — OLX, Standvirtual, Piscapisca, Auto SAPO

Guarda anúncios de carros dos 4 sites na tabela `ScrapedListing` (com link para o anúncio original e URLs das imagens em hotlink — não descarregamos ficheiros). Os ciclos correm de forma quase contínua: assim que um ciclo completo termina, o seguinte arranca `SCRAPE_INTERVAL_HOURS` (default 2) depois.

## Como funciona

- **Standvirtual** — lê o JSON `__NEXT_DATA__` embebido nas páginas de listagem (SSR). ~32 anúncios/página; a paginação da listagem geral chega ao inventário todo.
- **Piscapisca** — TransferState do Angular (SSR), percorrido marca a marca para contornar o limite de paginação.
- **OLX** — HTML server-side. As marcas são descobertas dinamicamente na página da categoria (apanha slugs não óbvios como `volkswagen-vw` e marcas novas); como o OLX trunca cada pesquisa a ~1000 resultados, marcas grandes são subdivididas automaticamente por distrito.
- **Auto SAPO** — HTML server-side; a paginação da listagem geral chega ao inventário todo.
- **API de backup** (`sites/carros-api.ts`, adapter `CARROS_API`) — 5.ª "fonte": a API Carros PT (n2-py-scraper no Railway) agrega os mesmos 4 portais e serve para apanhar anúncios que nos escapem. Os itens entram com `origin: "api"` e **nunca sobrepõem dados apanhados por nós**: um registo nosso não é tocado pela API; se o nosso scraper apanhar um anúncio que veio da API, reclama-o (origin passa a "scraper"); no dedupe, a cópia da API é escondida. O matching é por `(source, externalId)` com fallback por URL. Também tenta detalhe on-demand (`POST /listings/detail`, requer `CARROS_API_KEY`) como fallback quando a origem bloqueia.
- As fontes correm **em paralelo** (hosts diferentes; o delay educado é respeitado por site).
- O progresso (cursor por fonte) fica em `ScrapeState`, por isso o scraping pode ser interrompido e retomado — essencial para correr na Vercel por lotes.
- No fim de cada ciclo, anúncios que desapareceram dos sites ficam `active = false` (nunca são apagados).

## Primeiro uso (local)

```bash
npm run db:push        # cria as tabelas ScrapedListing / ScrapeState
npx prisma generate

# teste rápido: 3 páginas do Standvirtual
npm run scrape -- --site STANDVIRTUAL --max-pages 3

# ciclo completo (todas as fontes — demora ~2-4 h com o delay por defeito)
npm run scrape
```

Flags: `--site OLX|STANDVIRTUAL|PISCAPISCA|AUTOSAPO|CARROS_API`, `--max-pages N`, `--reset` (recomeça o ciclo).

Env vars opcionais: `SCRAPE_DELAY_MS` (default 700 — não baixes muito, é o que evita bloqueios), `SCRAPE_INTERVAL_HOURS` (default 2; `SCRAPE_INTERVAL_DAYS` antigo ainda é aceite), `SCRAPE_BATCH_PAGES` (default 600), `CARROS_API_BASE_URL` / `CARROS_API_PAGE_SIZE` / `CARROS_API_KEY` (API de backup; a chave também permite disparar a corrida remota pelo painel admin).

## Vercel (agendamento)

O `vercel.json` agenda `/api/cron/scrape` a cada 15 minutos. Cada invocação processa um lote de páginas (`SCRAPE_BATCH_PAGES`, default 600 — na prática o limite é o `maxDuration`) e sai; quando o ciclo termina, as invocações seguintes não fazem nada até passarem `SCRAPE_INTERVAL_HOURS`. Necessário:

1. **Postgres** (Neon/Vercel Postgres) — o SQLite não funciona na Vercel. Muda o `provider` no `schema.prisma` para `postgresql` e define `DATABASE_URL`.
2. **`CRON_SECRET`** nas env vars do projeto — a Vercel envia-o automaticamente nos pedidos do cron.
3. Atenção ao plano: no **Hobby** os crons só correm 1x/dia e as funções têm duração máxima menor — o ciclo completa na mesma, só demora mais dias na primeira vez. Alternativa: correr `npm run scrape` localmente (Agendador de Tarefas do Windows a cada 3 dias) contra a mesma BD.

## Avisos

- Os ToS destes sites proíbem scraping automatizado e as **fotos pertencem aos vendedores/portais** — por isso guardamos apenas URLs (hotlink) e o link para o anúncio original. Mostrar sempre a origem no site é o mais defensável. Isto não é aconselhamento jurídico.
- Os 3 parsers dependem da estrutura atual dos sites. Se um site mudar o layout, o adapter correspondente falha com uma mensagem clara no log — ajustar apenas o ficheiro em `scripts/scraper/sites/`.
- Se aparecerem erros HTTP 403/429, o site está a limitar: aumenta `SCRAPE_DELAY_MS` e tenta mais tarde.
