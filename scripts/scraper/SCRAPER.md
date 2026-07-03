# Scraper de carros — OLX, Standvirtual, Piscapisca

Guarda anúncios de carros dos 3 sites na tabela `ScrapedListing` (com link para o anúncio original e URLs das imagens em hotlink — não descarregamos ficheiros). Corre um ciclo completo a cada 3 dias.

## Como funciona

- **Standvirtual** — lê o JSON `__NEXT_DATA__` embebido nas páginas de listagem (SSR). ~32 anúncios/página.
- **Piscapisca** — HTML server-side, percorrido marca a marca para contornar o limite de paginação.
- **OLX** — API JSON interna do site; como o offset está limitado a ~1000 resultados, o universo é dividido automaticamente em bandas de preço.
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

Flags: `--site OLX|STANDVIRTUAL|PISCAPISCA`, `--max-pages N`, `--reset` (recomeça o ciclo).

Env vars opcionais: `SCRAPE_DELAY_MS` (default 700 — não baixes muito, é o que evita bloqueios), `SCRAPE_INTERVAL_DAYS` (default 3).

## Vercel (agendamento)

O `vercel.json` agenda `/api/cron/scrape` de 2 em 2 horas. Cada invocação processa um lote de páginas (`SCRAPE_BATCH_PAGES`, default 120) e sai; quando o ciclo termina, as invocações seguintes não fazem nada até passarem 3 dias. Necessário:

1. **Postgres** (Neon/Vercel Postgres) — o SQLite não funciona na Vercel. Muda o `provider` no `schema.prisma` para `postgresql` e define `DATABASE_URL`.
2. **`CRON_SECRET`** nas env vars do projeto — a Vercel envia-o automaticamente nos pedidos do cron.
3. Atenção ao plano: no **Hobby** os crons só correm 1x/dia e as funções têm duração máxima menor — o ciclo completa na mesma, só demora mais dias na primeira vez. Alternativa: correr `npm run scrape` localmente (Agendador de Tarefas do Windows a cada 3 dias) contra a mesma BD.

## Avisos

- Os ToS destes sites proíbem scraping automatizado e as **fotos pertencem aos vendedores/portais** — por isso guardamos apenas URLs (hotlink) e o link para o anúncio original. Mostrar sempre a origem no site é o mais defensável. Isto não é aconselhamento jurídico.
- Os 3 parsers dependem da estrutura atual dos sites. Se um site mudar o layout, o adapter correspondente falha com uma mensagem clara no log — ajustar apenas o ficheiro em `scripts/scraper/sites/`.
- Se aparecerem erros HTTP 403/429, o site está a limitar: aumenta `SCRAPE_DELAY_MS` e tenta mais tarde.
