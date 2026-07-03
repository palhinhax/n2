import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { fmtEur } from "@/lib/constants";
import { SOURCE_LABEL } from "@/components/external-car-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comparar carros",
  robots: { index: false },
};

type Col = {
  key: string;
  href: string;
  title: string;
  image?: string;
  price: number | null;
  year: number | null;
  km: number | null;
  fuel: string | null;
  gearbox: string | null;
  power: number | null;
  location: string | null;
  source: string;
};

export default async function Comparar({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const raw = (searchParams.ids || "").split(",").filter(Boolean).slice(0, 3);
  const carIds = raw.filter((k) => k.startsWith("car:")).map((k) => k.slice(4));
  const listingIds = raw
    .filter((k) => k.startsWith("listing:"))
    .map((k) => k.slice(8));

  const [cars, listings] = await Promise.all([
    carIds.length
      ? prisma.car.findMany({
          where: { id: { in: carIds } },
          include: {
            brand: true,
            model: true,
            photos: { orderBy: { position: "asc" }, take: 1 },
          },
        })
      : Promise.resolve([]),
    listingIds.length
      ? prisma.scrapedListing.findMany({ where: { id: { in: listingIds } } })
      : Promise.resolve([]),
  ]);

  const byKey = new Map<string, Col>();
  for (const c of cars) {
    byKey.set(`car:${c.id}`, {
      key: `car:${c.id}`,
      href: `/carros/${c.id}`,
      title: `${c.brand.name} ${c.model.name}${c.version ? " " + c.version : ""}`,
      image: c.photos[0]?.url,
      price: c.price,
      year: c.year,
      km: c.km,
      fuel: c.fuel,
      gearbox: c.gearbox,
      power: c.power,
      location: c.district,
      source: "Nacional 2",
    });
  }
  for (const l of listings) {
    let img: string | undefined;
    try {
      img = JSON.parse(l.imageUrls || "[]")[0];
    } catch {
      img = undefined;
    }
    byKey.set(`listing:${l.id}`, {
      key: `listing:${l.id}`,
      href: `/carros/externo/${l.id}`,
      title: l.title,
      image: img,
      price: l.price,
      year: l.year,
      km: l.km,
      fuel: l.fuel,
      gearbox: l.gearbox,
      power: l.power,
      location: l.location,
      source: SOURCE_LABEL[l.source] ?? l.source,
    });
  }
  // mantém a ordem escolhida
  const cols = raw.map((k) => byKey.get(k)).filter(Boolean) as Col[];

  const rows: [string, (c: Col) => string][] = [
    ["Preço", (c) => (c.price != null ? fmtEur(c.price) : "—")],
    ["Ano", (c) => (c.year != null ? String(c.year) : "—")],
    [
      "Quilómetros",
      (c) => (c.km != null ? c.km.toLocaleString("pt-PT") + " km" : "—"),
    ],
    ["Combustível", (c) => c.fuel || "—"],
    ["Caixa", (c) => c.gearbox || "—"],
    ["Potência", (c) => (c.power != null ? c.power + " cv" : "—")],
    ["Localização", (c) => c.location || "—"],
    ["Origem", (c) => c.source],
  ];

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1080px,94%)] py-7">
        <h1 className="mb-5 font-head text-[2rem] font-extrabold text-ink">
          Comparar carros
        </h1>

        {cols.length < 2 ? (
          <div className="n2-card p-10 text-center text-n2muted">
            Escolhe pelo menos 2 carros para comparar (carrega em “⇄ Comparar”
            nos anúncios).
            <div className="mt-4">
              <Link href="/carros" className="btn-clay btn-sm">
                Ver carros
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="w-32" />
                  {cols.map((c) => (
                    <th key={c.key} className="p-2 align-top">
                      <Link
                        href={c.href}
                        className="n2-card block overflow-hidden"
                      >
                        <div className="aspect-[16/10] bg-gradient-to-b from-[#FCF4E2] to-[#F4E2BC]">
                          {c.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.image}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                        </div>
                        <div className="p-2 text-left font-head text-[0.95rem] font-bold leading-tight text-ink">
                          {c.title}
                        </div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, get], i) => (
                  <tr key={label} className={i % 2 ? "bg-white/50" : ""}>
                    <td className="p-2 text-[0.85rem] font-semibold text-n2muted">
                      {label}
                    </td>
                    {cols.map((c) => (
                      <td
                        key={c.key}
                        className="p-2 text-center text-[0.92rem] font-semibold text-ink"
                      >
                        {get(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
