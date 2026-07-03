import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarCard from "@/components/car-card";
import { formatHours } from "@/lib/hours";
import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const u = await prisma.user.findUnique({ where: { id: params.id } });
  if (!u || u.accountType !== "STAND")
    return { title: "Stand", robots: { index: false } };
  const name = u.standName || u.name || "Stand";
  const description = clamp(
    u.bio ||
      `${name} — carros usados à venda${u.city ? ` em ${u.city}` : ""}. Vê o stock no ${SITE_NAME}.`
  );
  return {
    title: `${name} — carros à venda`,
    description,
    alternates: { canonical: absolute(`/stand/${u.id}`) },
    openGraph: {
      title: `${name} | ${SITE_NAME}`,
      description,
      images: u.avatarUrl ? [{ url: u.avatarUrl }] : undefined,
    },
  };
}

export default async function StandProfile({
  params,
}: {
  params: { id: string };
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      cars: {
        where: { forSale: true, status: "APPROVED" },
        include: {
          brand: true,
          model: true,
          photos: { orderBy: { position: "asc" } },
          owner: true,
          _count: { select: { offers: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user || user.accountType !== "STAND") notFound();

  const displayName = user.standName || user.name || "Stand";
  const contactBits = [
    user.phone,
    [user.address, user.postalCode, user.city].filter(Boolean).join(", "),
    user.district,
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: displayName,
    url: absolute(`/stand/${user.id}`),
    ...(user.avatarUrl ? { image: user.avatarUrl, logo: user.avatarUrl } : {}),
    ...(user.phone ? { telephone: user.phone } : {}),
    ...(user.website ? { sameAs: [user.website] } : {}),
    ...(user.address || user.city
      ? {
          address: {
            "@type": "PostalAddress",
            ...(user.address ? { streetAddress: user.address } : {}),
            ...(user.postalCode ? { postalCode: user.postalCode } : {}),
            ...(user.city ? { addressLocality: user.city } : {}),
            addressCountry: "PT",
          },
        }
      : {}),
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(1180px,94%)] py-7">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/carros" className="hover:underline">
            Carros
          </Link>{" "}
          › <b className="text-ink">{displayName}</b>
        </div>

        {/* cabeçalho do stand */}
        <div className="n2-card mb-6 flex flex-wrap items-center gap-5 p-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-outline bg-cream">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-n2muted">
                🏢
              </div>
            )}
          </div>
          <div className="min-w-[240px] flex-1">
            <span className="n2-tag bg-bark">Stand</span>
            <h1 className="mt-1 font-head text-[1.9rem] font-extrabold leading-tight text-ink">
              {displayName}
            </h1>
            {contactBits.length > 0 && (
              <p className="mt-1 text-[0.9rem] text-n2muted">
                {contactBits.join(" · ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-[0.85rem] font-semibold">
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-clay hover:underline"
                >
                  Website ↗
                </a>
              )}
              {user.hours && !formatHours(user.hours) && (
                <span className="text-n2muted">🕒 {user.hours}</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="font-head text-[2rem] font-extrabold text-ink">
              {user.cars.length}
            </div>
            <div className="text-[0.8rem] font-semibold text-n2muted">
              anúncios ativos
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {user.bio && (
            <div className="n2-card p-5">
              <p className="whitespace-pre-line text-[0.92rem] leading-relaxed text-ink/90">
                {user.bio}
              </p>
            </div>
          )}
          {formatHours(user.hours) && (
            <div className="n2-card p-5">
              <h3 className="mb-2 font-head text-[1.05rem] font-bold text-ink">
                🕒 Horário
              </h3>
              <dl className="grid grid-cols-1 gap-y-1 text-[0.9rem]">
                {formatHours(user.hours)!.map(({ day, text }) => (
                  <div key={day} className="flex justify-between gap-3">
                    <dt className="font-medium text-n2muted">{day}</dt>
                    <dd
                      className={`text-right font-semibold ${
                        text === "Fechado" ? "text-n2muted2" : "text-ink"
                      }`}
                    >
                      {text}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
          Carros à venda
        </h2>
        {user.cars.length === 0 ? (
          <div className="n2-card p-8 text-center text-n2muted">
            Este stand ainda não tem anúncios ativos.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {user.cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
