import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import KeywordAdmin from "@/components/keyword-admin";
import {
  matchSuspiciousKeywords,
  SUSPICION_REASONS,
} from "@/lib/listing-quality";

export const dynamic = "force-dynamic";

export default async function AdminSuspeitos() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") notFound();

  const [keywords, flaggedRows, exemptRows] = await Promise.all([
    prisma.suspiciousKeyword.findMany({ orderBy: { createdAt: "desc" } }),
    // anúncios apanhados pelas palavras (os mais recentes primeiro)
    prisma.scrapedListing.findMany({
      where: {
        active: true,
        suspiciousReasons: { contains: SUSPICION_REASONS.keyword },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 100,
      select: {
        id: true,
        source: true,
        url: true,
        title: true,
        rawTitle: true,
        description: true,
        price: true,
        year: true,
      },
    }),
    // marcados pelo admin como "é mesmo um carro"
    prisma.scrapedListing.findMany({
      where: { keywordExempt: true },
      orderBy: { lastSeenAt: "desc" },
      take: 50,
      select: { id: true, source: true, url: true, title: true },
    }),
  ]);

  const words = keywords.map((k) => k.word);
  const flagged = flaggedRows.map((l) => ({
    id: l.id,
    source: l.source,
    url: l.url,
    title: l.rawTitle ?? l.title,
    price: l.price,
    year: l.year,
    // que palavra(s) o apanharam — recalculado aqui só para mostrar
    matchedWords: matchSuspiciousKeywords(
      words,
      l.rawTitle ?? l.title,
      l.description
    ),
    inDescription:
      matchSuspiciousKeywords(words, l.rawTitle ?? l.title).length === 0,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-7">
        <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-olive">
          Administração
        </span>
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          Palavras suspeitas
        </h1>
        <p className="mb-2 max-w-[70ch] text-[0.92rem] text-n2muted">
          Vai adicionando palavras que denunciam anúncios que não são carros
          (mota, cama, brinquedo, sofá…). Qualquer anúncio externo cujo{" "}
          <b>título ou descrição</b> contenha uma destas palavras é marcado
          suspeito e sai das listagens. Falso positivo? Marca-o como &quot;É
          carro&quot; e as palavras deixam de o apanhar.
        </p>
        <Link
          href="/admin"
          className="mb-5 inline-block text-[0.85rem] font-semibold text-olive underline"
        >
          ← Voltar ao painel
        </Link>

        <KeywordAdmin
          keywords={keywords.map((k) => ({
            id: k.id,
            word: k.word,
            matches: k.matches,
          }))}
          flagged={flagged}
          exempt={exemptRows}
        />
      </div>
      <SiteFooter />
    </div>
  );
}
