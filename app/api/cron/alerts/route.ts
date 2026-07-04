import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { countListings, type ListingQuery } from "@/lib/car-listing";
import { createNotification } from "@/lib/notifications";
import { sendEmail, alertEmailHtml } from "@/lib/email";
import { fmtEur } from "@/lib/constants";

/**
 * Cron de alertas inteligentes (corre 1x/dia, depois do scraping):
 *  1. Favoritos cujo preço DESCEU desde a última notificação → notificação
 *     (+ email, se RESEND_API_KEY estiver configurada).
 *  2. Pesquisas guardadas com carros novos → notificação (+ email).
 *
 * Idempotente: `Favorite.notifiedPrice` e `SavedSearch.notifiedCount`
 * garantem que cada mudança só é notificada uma vez.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let priceDrops = 0;
  let searchAlerts = 0;
  let emails = 0;

  try {
    // ---- 1. descidas de preço nos favoritos ----
    const favs = await prisma.favorite.findMany({
      select: {
        id: true,
        userId: true,
        priceWhenSaved: true,
        notifiedPrice: true,
        user: { select: { email: true } },
        car: { select: { id: true, price: true, forSale: true, status: true } },
        listing: {
          select: { id: true, price: true, title: true, active: true },
        },
      },
    });

    for (const f of favs) {
      const current =
        f.listing?.active !== false
          ? (f.car?.price ?? f.listing?.price ?? null)
          : null;
      if (current == null) continue;
      const baseline = f.notifiedPrice ?? f.priceWhenSaved;
      if (baseline == null || current >= baseline) {
        // subiu ou igual: atualiza a base para futuras descidas serem
        // medidas a partir do valor mais recente
        if (f.notifiedPrice !== current)
          await prisma.favorite.update({
            where: { id: f.id },
            data: { notifiedPrice: current },
          });
        continue;
      }

      // desceu → notifica
      const title = f.listing?.title ?? "Um carro que guardaste";
      const url = f.car
        ? `/carros/${f.car.id}`
        : f.listing
          ? `/carros/externo/${f.listing.id}`
          : "/favoritos";
      const drop = baseline - current;
      await createNotification({
        userId: f.userId,
        kind: "PRICE_DROP",
        title: `▼ ${title} baixou ${fmtEur(drop)}`,
        body: `De ${fmtEur(baseline)} para ${fmtEur(current)}.`,
        url,
      });
      await prisma.favorite.update({
        where: { id: f.id },
        data: { notifiedPrice: current },
      });
      priceDrops++;

      if (f.user.email) {
        const ok = await sendEmail({
          to: f.user.email,
          subject: `▼ Baixou de preço: ${title}`,
          html: alertEmailHtml({
            title: "Um favorito teu baixou de preço",
            body: `<b>${title}</b> baixou ${fmtEur(drop)} — de ${fmtEur(baseline)} para <b>${fmtEur(current)}</b>.`,
            ctaLabel: "Ver o anúncio",
            ctaPath: url,
          }),
        });
        if (ok) emails++;
      }
    }

    // ---- 2. carros novos nas pesquisas guardadas ----
    const searches = await prisma.savedSearch.findMany({
      select: {
        id: true,
        userId: true,
        label: true,
        query: true,
        lastCount: true,
        notifiedCount: true,
        user: { select: { email: true } },
      },
    });

    for (const s of searches) {
      let q: ListingQuery = {};
      try {
        q = JSON.parse(s.query);
      } catch {
        continue;
      }
      const count = await countListings(q);
      const baseline = Math.max(s.lastCount, s.notifiedCount);
      if (count <= baseline) {
        // se desceu (anúncios removidos), realinha para não "acumular" falsos novos
        if (count < s.notifiedCount)
          await prisma.savedSearch.update({
            where: { id: s.id },
            data: { notifiedCount: count },
          });
        continue;
      }

      const novos = count - baseline;
      let href = "/carros";
      try {
        href =
          "/carros?" +
          new URLSearchParams(q as Record<string, string>).toString();
      } catch {
        /* ignore */
      }
      await createNotification({
        userId: s.userId,
        kind: "NEW_MATCHES",
        title: `🔔 ${novos === 1 ? "1 carro novo" : `${novos} carros novos`}: ${s.label}`,
        body: `A tua pesquisa "${s.label}" tem agora ${count.toLocaleString("pt-PT")} carros.`,
        url: href,
      });
      await prisma.savedSearch.update({
        where: { id: s.id },
        data: { notifiedCount: count },
      });
      searchAlerts++;

      if (s.user.email) {
        const ok = await sendEmail({
          to: s.user.email,
          subject: `🔔 ${novos === 1 ? "1 carro novo" : `${novos} carros novos`} para "${s.label}"`,
          html: alertEmailHtml({
            title: "Apareceram carros novos para a tua pesquisa",
            body: `A pesquisa <b>${s.label}</b> tem ${novos === 1 ? "1 carro novo" : `${novos} carros novos`} desde a última vez.`,
            ctaLabel: "Ver os carros",
            ctaPath: href,
          }),
        });
        if (ok) emails++;
      }
    }

    return NextResponse.json({ ok: true, priceDrops, searchAlerts, emails });
  } catch (err) {
    console.error("[cron/alerts]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
