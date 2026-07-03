import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarCard from "@/components/car-card";
import AdSlot from "@/components/ad-slot";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featured, brands, totals] = await Promise.all([
    prisma.car.findMany({
      where: { forSale: true, status: "APPROVED" },
      include: {
        brand: true,
        model: true,
        photos: { orderBy: { position: "asc" } },
        owner: true,
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.car.count({ where: { forSale: true, status: "APPROVED" } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />

      {/* hero */}
      <section className="border-b border-outline bg-gradient-to-b from-[#FFFDF7] via-[#FBF3E0] to-[#F7EAD0]">
        <div className="mx-auto w-[min(1240px,94%)] py-12 text-center">
          <h1 className="font-head text-[clamp(1.9rem,4vw,3rem)] font-extrabold text-ink">
            O portal de carros à tua maneira
          </h1>
          <p className="mb-6 text-[1.08rem] text-n2muted">
            Compra e vende carros usados{" "}
            <b className="text-olive">sem pagar comissões</b>. Garagem,
            lembretes, ofertas — tudo grátis.
          </p>
          <form
            action="/carros"
            className="n2-card mx-auto grid max-w-[900px] grid-cols-2 gap-3 p-5 text-left md:grid-cols-5"
          >
            <div>
              <label className="flabel">Marca</label>
              <select name="marca" className="finput">
                <option value="">Todas</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flabel">Preço até</label>
              <select name="precoMax" className="finput">
                <option value="">Sem limite</option>
                {[10000, 15000, 20000, 30000, 50000, 80000].map((p) => (
                  <option key={p} value={p}>
                    {p.toLocaleString("pt-PT")} €
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flabel">Combustível</label>
              <select name="fuel" className="finput">
                <option value="">Todos</option>
                {[
                  "Gasolina",
                  "Diesel",
                  "Híbrido",
                  "Híbrido Plug-In",
                  "Elétrico",
                  "GPL",
                ].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flabel">Ano desde</label>
              <select name="anoMin" className="finput">
                <option value="">Qualquer</option>
                {[2015, 2018, 2020, 2022, 2024].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <button className="btn-clay self-end">Pesquisar →</button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link className="n2-chip" href="/carros?fuel=El%C3%A9trico">
              ⚡ Elétricos
            </Link>
            <Link className="n2-chip" href="/carros?precoMax=10000">
              💶 Até 10 000 €
            </Link>
            <Link className="n2-chip" href="/carros?caixa=Autom%C3%A1tica">
              ⚙ Automáticos
            </Link>
            <Link className="n2-chip" href="/carros?autonomiaMin=300">
              🔋 +300 km autonomia
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 w-[min(1240px,94%)]">
        <AdSlot variant="banner" index={0} />
      </div>

      {/* sell strip com a imagem da marca */}
      <section className="mx-auto mt-8 w-[min(1240px,94%)]">
        <div className="grid items-center overflow-hidden rounded-2xl bg-gradient-to-r from-ink to-[#37331F] text-[#F3ECD9] md:grid-cols-[1fr_320px]">
          <div className="p-8">
            <h2 className="font-head text-[1.7rem] font-extrabold text-white">
              A tua garagem digital.{" "}
              <span className="text-stone2">Vender é opcional.</span>
            </h2>
            <p className="max-w-[52ch] text-[#C9BFA6]">
              Guarda os teus carros, recebe lembretes de IPO, seguro e
              manutenção — e quando quiseres vender, é um clique. Grátis.
            </p>
            <Link href="/garagem/novo" className="btn-clay mt-4">
              Adicionar o meu carro →
            </Link>
          </div>
          <div className="relative hidden h-full min-h-[220px] md:block">
            <Image
              src="/brand/nacional2-hero.png"
              alt="Marco da Estrada Nacional 2"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* featured */}
      <section className="mx-auto mt-10 w-[min(1240px,94%)]">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-clay">
              À venda agora
            </span>
            <h2 className="font-head text-[1.7rem] font-extrabold text-ink">
              {totals} carros à tua espera
            </h2>
          </div>
          <Link
            href="/carros"
            className="font-semibold text-bark underline underline-offset-2"
          >
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 3).map((c) => (
            <CarCard key={c.id} car={c} />
          ))}
          <AdSlot index={1} />
          {featured.slice(3, 7).map((c) => (
            <CarCard key={c.id} car={c} />
          ))}
        </div>
      </section>

      {/* trust */}
      <section className="mx-auto mt-10 grid w-[min(1240px,94%)] grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["0€", "100% grátis", "Sem comissões, nunca"],
          ["🔔", "Lembretes", "IPO, seguro, manutenção"],
          ["🤝", "Ofertas diretas", "Negoceia com o vendedor"],
          ["✓", "Moderação", "Anúncios validados pela equipa"],
        ].map(([ic, t, s]) => (
          <div key={t} className="n2-card flex items-center gap-3 px-4 py-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-cream font-head font-extrabold text-bark">
              {ic}
            </div>
            <div>
              <b className="block font-head leading-tight text-ink">{t}</b>
              <span className="text-[0.8rem] text-n2muted">{s}</span>
            </div>
          </div>
        ))}
      </section>

      <SiteFooter />
    </div>
  );
}
