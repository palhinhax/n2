# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**Nacional 2** is a free Portuguese used-car marketplace. Despite the template README, this is a full product, not a generic SaaS. The core value proposition is aggregating scraped listings from OLX, Standvirtual, Pisca Pisca, and Auto SAPO alongside native listings, all in one interface — with zero listing fees for sellers.

The `features/posts/` directory is a leftover from the Next.js SaaS template this was bootstrapped from and is essentially unused beyond tests. The real business logic lives in `lib/`, `components/`, and `app/`.

---

## Commands

```bash
pnpm dev              # development server (localhost:3000)
pnpm build            # prisma generate + next build
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Jest (all tests)
pnpm test:watch       # Jest watch mode
pnpm test:coverage    # Jest with coverage report
pnpm format           # Prettier (write)
pnpm format:check     # Prettier (check, used in CI)

# Database
pnpm db:push          # prisma db push (apply schema without migration)
pnpm db:migrate       # prisma migrate dev (create + run migration)
pnpm db:seed          # seed brands/models + demo data
pnpm db:studio        # Prisma Studio UI

# Scraping
pnpm scrape                          # run all scrapers
pnpm scrape -- --site standvirtual   # single source
pnpm scrape -- --max-pages 5         # limit pages
pnpm scrape -- --reset               # restart cycle from scratch
pnpm normalize:listings              # normalize brand/model fields
pnpm quality:flag                    # flag suspicious listings
pnpm scrape:foreign                  # foreign (EU) sources — see "Import Cars from Europe"
pnpm scrape:foreign -- --source demo-eu   # single foreign source (even if disabled)
```

After any Prisma schema change, run `pnpm db:push` (dev) or `pnpm db:migrate` (tracked migration) and restart the dev server.

Run a single test file:

```bash
pnpm test -- tests/unit/post-form.test.tsx
```

---

## Architecture

### Dual-Source Listing System

The most important architectural concept: every listing page merges **two data sources** into one unified feed.

- `Car` — native listings created by registered users (particular or stand), must be `status: APPROVED` and `forSale: true` to appear publicly.
- `ScrapedListing` — external listings scraped from OLX/Standvirtual/Piscapisca/AutoSapo, must be `active: true`, `isDuplicate: false`, `suspicious: false`.

`lib/car-listing.ts` is the single source of truth for building this merged feed:

- `fetchListingPage()` queries both tables in parallel, merges/sorts client-side, and returns a paginated `ListingPage`.
- `buildWheres()` translates the `ListingQuery` URL params into Prisma `where` clauses for both sources, handling fuel type normalization (many spelling variations across sites) and brand aliases (VW ↔ Volkswagen).
- `fetchBrandOptions()` builds the filter dropdowns from both sources combined.

The `/api/carros` route uses this for infinite scroll (24 items per page).

### Polymorphic Models

Several models are intentionally polymorphic (nullable FK to either `Car` or `ScrapedListing`):

- `Favorite` — a user can heart either a native car or an external listing.
- `PricePoint` — price history for both source types.

Both have `@@unique` constraints to prevent duplicate favorites per user.

### Car Status Flow

`GARAGE` → `PENDING` (when user sets `forSale: true`) → `APPROVED` or `REJECTED` by admin.

Only `APPROVED` cars appear in public listings. The admin panel at `/admin` handles moderation.

### Auth & Roles

Auth.js v5 (NextAuth beta) with JWT strategy. The `role` (`USER` | `ADMIN`) and `accountType` (`PARTICULAR` | `STAND`) live on the `User` model and are propagated into the JWT token via callbacks in `lib/auth/config.ts`.

Protected routes (`/dashboard`, `/garagem`, `/admin`) are enforced in `middleware.ts`. The middleware also sets the anonymous visitor cookie (`n2vid`, see `lib/constants.ts`) on every page request — this runs on all non-API, non-static routes.

### Scraper Architecture

`scripts/scraper/` — each source has an adapter in `sites/` implementing the `SiteAdapter` interface (defined in `types.ts`). The engine in `engine.ts` drives all adapters, persisting a resumable cursor in the `ScrapeState` DB table so Vercel's 10s function timeout doesn't lose progress between invocations.

The scrape cycle runs every 2 hours via `/api/cron/scrape` (Vercel Cron, protected by `CRON_SECRET`). A full cycle completes when all sources finish; only then does `deactivateStale` mark gone listings as `active=false` and `dedupeListings` hide cross-source duplicates.

Image URLs from scraped listings are stored as JSON arrays (hotlink to origin CDNs, never downloaded). Listing details (description, equipment, color, etc.) are fetched on demand when someone opens the listing for the first time (`detailsFetchedAt` is set).

### AI Features

AI entry points are in `lib/assistant.ts` (car-page chat + site-wide assistant), `/api/ai/descricao` (AI-generated listing description), and `/api/ai/avaliar` (car valuation). All AI calls gate on daily per-user quotas managed in `lib/ai-limit.ts` via the `AiUsage` model (atomic increment, `userId+day+kind` unique key).

`ModelReport` caches AI-generated model issue summaries per `brand|model|fuel` for 180 days — so one OpenAI call serves all visitors viewing any listing of that model.

### Market Price Intelligence

`lib/price-intel.ts` computes median/p25/p75 price stats directly from the `ScrapedListing` table for a given brand+model (±1 year). `marketStatsBatch()` does this for multiple models in a single query (used on listing cards). Price ratings (`great` / `good` / `fair` / `high`) are attached to each `ListingItem` via `data._rating`.

### Image Upload

Browser → POST `/api/upload` → server uploads to Backblaze B2 via `@aws-sdk/client-s3`. Server-side upload avoids CORS. `lib/b2.ts` wraps the S3 client. If B2 is not configured (`b2Configured()` returns false), the UI falls back to car art illustrations.

### Alert System

Daily cron at 07:30 (`/api/cron/alerts`) checks each user's favorites and saved searches:

- Favorites: if price dropped below `Favorite.notifiedPrice`, creates a `Notification` (in-app, kind `PRICE_DROP`) and optionally emails via Resend.
- Saved searches: if `countListings()` returns more than `SavedSearch.notifiedCount`, creates a `NEW_MATCHES` notification.

Notifications appear in the `/notificacoes` page and as a badge on the navbar bell icon.

### Suspicious Listing Detection

`lib/listing-quality.ts` flags listings with implausible data (km > 1M, price < 500 or > 1M, year out of range, "para peças" in title). Suspicious listings are stored but hidden from all public listing queries, sitemap, and market stats. Their detail page is served with `noindex`.

### Import Cars from Europe

A separate vertical at `/importar-carros` for discovering cars for sale in 8 EU countries and estimating the full cost of importing each one into Portugal.

- `ForeignListing` is its own table (not merged into the main feed). Public queries require `active: true`, `status: "APPROVED"`, `isDuplicate: false`, `suspicious: false`. `lib/import-listing.ts` is the feed/filters module (country, CO₂, engine size, distance, estimated total cost, estimated savings, …).
- `lib/import-cost.ts` computes the full landed-cost breakdown (transport by country distance, export plates/docs, type-B inspection, legalization, ISV via `lib/car-tax.ts` with the EU used-car age reduction; annual IUC shown separately, not summed). Missing CO₂/displacement are estimated and lower the stated confidence. Logistic/admin assumptions are **configurable at runtime** in the `ImportConfig` table (edited at `/admin/importacao`), not hardcoded.
- Comparison with the PT market uses `lib/price-intel.ts` medians; `rateImportDeal()` yields `EXCELLENT | GOOD | NEUTRAL | BAD`. Cached columns (`importTotalEur`, `ptMarketMedian`, `savingsEur`, `dealRating`) are refreshed at the end of each scrape cycle so they work as indexed filters/sorts; the detail page recomputes live with year-adjusted stats.
- The foreign scraper lives in `scripts/scraper/foreign/` (same cursor/cycle mechanics as the national one; state in `ScrapeState` under `import:*` keys). Sources are DB rows (`ImportSource`, managed in the admin) pointing to adapters registered in `sites/index.ts`. Adapters must call `assertAllowedByRobots()` before every request — a disallowed path aborts the source and logs the reason. Real sources are seeded **disabled** (admin reviews ToS/robots first); the `demo` adapter generates synthetic listings for development. Cron: `/api/cron/scrape-foreign` (every 2h, `CRON_SECRET`), logs in `ImportScrapeLog`.
- Leads from the "Quero importar este carro" button land in `ImportLead` (managed + CSV export at `/admin/importacao`). SEO pages: `/importar-carros/[pais]`, `/carros-importados`, `/simulador-isv`, `/quanto-custa-importar-carro`.

### Visitor Tracking & Recommendations

`BrowseEvent` records page views and searches with denormalized car attributes (no FK, intentional) so events survive listing deletion and anonymous+logged sessions can be merged. The visitor UUID from the `n2vid` cookie is set in the middleware before the first request hits any page handler.

---

## Key `lib/` Modules

| Module                 | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `car-listing.ts`       | Merged listing feed, filters, brand options           |
| `price-intel.ts`       | Market price stats and rating                         |
| `assistant.ts`         | AI system prompts and OpenAI tool definitions         |
| `ai-limit.ts`          | Daily AI quota enforcement                            |
| `listing-quality.ts`   | Suspicious listing detection                          |
| `search.ts`            | Fuzzy brand/model search (bigram similarity)          |
| `b2.ts`                | Backblaze B2 image upload                             |
| `favorites.ts`         | Polymorphic favorite logic                            |
| `notifications.ts`     | In-app notification creation                          |
| `vehicle-normalize.ts` | Brand/model normalization for scraper                 |
| `seo.ts`               | Canonical URLs, metadata helpers                      |
| `constants.ts`         | Shared enums (fuels, districts, reminder types, etc.) |

---

## Environment Variables

See `.env.example`. Notable non-obvious ones:

- `CRON_SECRET` — must be in the `Authorization: Bearer` header of requests to `/api/cron/*`.
- `OPENAI_MODEL` — defaults to gpt-4o-mini if unset; override to use a different model.
- `AI_DAILY_LIMIT_CHAT` / `AI_DAILY_LIMIT_AVALIAR` / `AI_DAILY_LIMIT_DESCREVER` — per-user daily caps (defaults: 20 / 5 / 10).
- `RESEND_API_KEY` — optional; without it, alerts are in-app only (no email).
- B2 variables are all optional; without them, user photo upload is disabled.

---

## Testing

Tests are Jest + React Testing Library + MSW. MSW handlers live in `tests/mocks/handlers.ts`, server setup in `tests/mocks/server.ts`. The `features/posts/` tests are the primary examples and cover the React Query hooks and form components.

CI (`.github/workflows/ci.yml`) runs: `prisma generate` → `lint` → `typecheck` → `test` → `build`.
