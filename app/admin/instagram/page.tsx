import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import InstagramStudio from "@/components/instagram-studio";
import InstagramIndexStudio from "@/components/instagram-index-studio";
import {
  loadSubject,
  buildCaption,
  buildIndexCaption,
  canvasFields,
  instagramConfigured,
  checkInstagramAccount,
  type IgKind,
} from "@/lib/instagram";
import { computeMarketIndex, monthLabel } from "@/lib/market-index";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Search = { kind?: string; id?: string; q?: string };

/** Candidatos a post: carros do site publicados + anúncios externos. */
async function findCandidates(q: string) {
  const text = q.trim();
  const like = { contains: text, mode: "insensitive" as const };

  const [cars, listings] = await Promise.all([
    prisma.car.findMany({
      where: {
        status: "APPROVED",
        forSale: true,
        ...(text
          ? {
              OR: [
                { brand: { name: like } },
                { model: { name: like } },
                { version: like },
              ],
            }
          : {}),
      },
      include: { brand: true, model: true },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 12,
    }),
    text
      ? prisma.scrapedListing.findMany({
          where: {
            active: true,
            isDuplicate: false,
            suspicious: false,
            OR: [{ title: like }, { brand: like }, { model: like }],
          },
          orderBy: { firstSeenAt: "desc" },
          take: 12,
        })
      : Promise.resolve([] as any[]),
  ]);

  return [
    ...cars.map((c) => ({
      kind: "car" as const,
      id: c.id,
      title: [c.brand.name, c.model.name, c.version].filter(Boolean).join(" "),
      meta: `${c.year} · ${c.km.toLocaleString("pt-PT")} km · ${fmtEur(c.price)}`,
      tag: c.featured ? "★ Destaque" : "Do site",
    })),
    ...listings.map((l) => ({
      kind: "listing" as const,
      id: l.id,
      title: l.title,
      meta: [
        l.year,
        l.km != null ? `${l.km.toLocaleString("pt-PT")} km` : null,
        fmtEur(l.price),
      ]
        .filter(Boolean)
        .join(" · "),
      tag: l.source,
    })),
  ];
}

export default async function InstagramAdmin({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") notFound();

  const kind = (
    searchParams.kind === "car" || searchParams.kind === "listing"
      ? searchParams.kind
      : null
  ) as IgKind | null;
  const isIndexMode = searchParams.kind === "indice";
  const id = searchParams.id ?? null;
  const q = searchParams.q ?? "";

  const apiEnabled = instagramConfigured();

  const [subject, marketIdx, candidates, history, account] = await Promise.all([
    kind && id ? loadSubject(kind, id) : Promise.resolve(null),
    isIndexMode ? computeMarketIndex() : Promise.resolve(null),
    findCandidates(q),
    prisma.instagramPost.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    // confirma logo o token: os de longa duração expiram ao fim de 60 dias e
    // é melhor saber isso aqui do que ao carregar em "Publicar"
    apiEnabled
      ? checkInstagramAccount().catch((e: Error) => ({ error: e.message }))
      : Promise.resolve(null),
  ]);
  const accountError = account && "error" in account ? account.error : null;
  const username = account && "username" in account ? account.username : null;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-7">
        <Link href="/admin" className="text-[0.9rem] font-semibold text-bark">
          ← Administração
        </Link>
        <h1 className="mb-1 mt-2 font-head text-[2rem] font-extrabold text-ink">
          📸 Posts para Instagram
        </h1>
        <p className="mb-3 text-[0.95rem] text-n2muted">
          Gera a imagem (1080×1350) e a legenda de um anúncio.{" "}
          {apiEnabled
            ? "Podes publicar direto ou descarregar para publicar à mão."
            : "A publicação por API está desligada — define IG_ACCESS_TOKEN para a ativar. Até lá, descarrega a imagem e publica à mão."}
        </p>

        {accountError ? (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[0.9rem] text-red-900">
            <b>O Instagram recusou o token:</b> {accountError}
            <div className="mt-1 text-[0.85rem]">
              Os tokens de longa duração expiram ao fim de 60 dias — gera um
              novo. A publicação por API não vai funcionar até lá; o download
              manual continua a funcionar.
            </div>
          </div>
        ) : username ? (
          <div className="mb-6 text-[0.9rem] font-semibold text-olive">
            ✓ Ligado a @{username} — é aqui que os posts saem.
          </div>
        ) : null}

        {isIndexMode ? (
          marketIdx && marketIdx.currentMedian != null ? (
            <InstagramIndexStudio
              data={{
                monthLabel:
                  marketIdx.months.length > 0
                    ? monthLabel(
                        marketIdx.months[marketIdx.months.length - 1].month
                      )
                    : new Date().toLocaleDateString("pt-PT", {
                        month: "long",
                        year: "numeric",
                      }),
                median: fmtEur(marketIdx.currentMedian),
                momPct: marketIdx.momPct,
                activeCount: marketIdx.activeCount.toLocaleString("pt-PT"),
                months: marketIdx.months.map((m) => ({
                  label: monthLabel(m.month).split(" ")[0],
                  median: m.median,
                })),
                fuels: marketIdx.fuels.map((f) => ({
                  seg: f.seg,
                  median: fmtEur(f.median),
                })),
              }}
              defaultCaption={buildIndexCaption({
                monthLabel:
                  marketIdx.months.length > 0
                    ? monthLabel(
                        marketIdx.months[marketIdx.months.length - 1].month
                      )
                    : new Date().toLocaleDateString("pt-PT", {
                        month: "long",
                        year: "numeric",
                      }),
                median: marketIdx.currentMedian,
                momPct: marketIdx.momPct,
                activeCount: marketIdx.activeCount,
                fuels: marketIdx.fuels,
              })}
              apiEnabled={apiEnabled && !accountError}
            />
          ) : (
            <div className="n2-card p-6 text-n2muted">
              Os dados do índice ainda não estão disponíveis (é preciso pelo
              menos um mês de scraping com amostra suficiente).
            </div>
          )
        ) : null}

        {subject && kind && id ? (
          <InstagramStudio
            kind={kind}
            id={id}
            title={subject.title}
            fields={canvasFields(subject)}
            defaultCaption={buildCaption(subject)}
            hasPhoto={!!subject.photoUrl}
            apiEnabled={apiEnabled && !accountError}
          />
        ) : null}

        {!isIndexMode && (
          <div className="mb-6">
            <Link
              href="/admin/instagram?kind=indice"
              className="btn-line btn-sm inline-flex"
            >
              📈 Post mensal do índice de preços →
            </Link>
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            Escolher anúncio
          </h2>
          <form className="mb-3 flex gap-2" action="/admin/instagram">
            <input
              name="q"
              defaultValue={q}
              placeholder="Procurar por marca, modelo…"
              className="finput flex-1"
            />
            <button className="btn-olive btn-sm" type="submit">
              Procurar
            </button>
          </form>
          <p className="mb-3 text-[0.85rem] text-n2muted2">
            Sem pesquisa mostramos os anúncios do site. Escreve algo para
            incluir também os anúncios externos.
          </p>
          <div className="flex flex-col gap-2">
            {candidates.length === 0 && (
              <div className="n2-card p-6 text-n2muted">Nada encontrado.</div>
            )}
            {candidates.map((c) => (
              <Link
                key={`${c.kind}-${c.id}`}
                href={`/admin/instagram?kind=${c.kind}&id=${c.id}${
                  q ? `&q=${encodeURIComponent(q)}` : ""
                }`}
                className="n2-card flex flex-wrap items-center gap-3 px-4 py-3 hover:shadow-warmlg"
              >
                <div>
                  <b className="font-head text-[1.05rem] text-ink">{c.title}</b>
                  <div className="text-[0.85rem] text-n2muted">{c.meta}</div>
                </div>
                <span className="n2-tag ml-auto bg-weathered">{c.tag}</span>
              </Link>
            ))}
          </div>
        </section>

        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
              Histórico
            </h2>
            <div className="n2-card overflow-x-auto">
              <table className="w-full text-[0.9rem]">
                <thead>
                  <tr className="border-b border-outline text-left font-head text-[0.75rem] uppercase tracking-wider text-n2muted2">
                    <th className="px-4 py-2">Carro</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Quando</th>
                    <th className="px-4 py-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id} className="border-b border-outline/60">
                      <td className="px-4 py-2 font-semibold text-ink">
                        {p.title}
                      </td>
                      <td className="px-4 py-2">
                        {p.status === "PUBLISHED"
                          ? "✅ Publicado"
                          : p.status === "DOWNLOADED"
                            ? "⬇ Descarregado"
                            : p.status === "FAILED"
                              ? `⚠ Falhou — ${p.error ?? ""}`
                              : p.status}
                      </td>
                      <td className="px-4 py-2 text-n2muted">
                        {p.createdAt.toLocaleString("pt-PT")}
                      </td>
                      <td className="px-4 py-2">
                        {p.permalink ? (
                          <a
                            href={p.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-bark underline"
                          >
                            ver
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
