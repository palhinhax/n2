import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { absolute, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Como comprar e vender em segurança | Nacional 2",
  description:
    "Dicas para comprar e vender carros usados em segurança em Portugal: verificar o veículo, evitar burlas, pagamento seguro e reportar anúncios suspeitos.",
  alternates: { canonical: absolute("/seguranca") },
};

const BUY = [
  "Vê o carro pessoalmente antes de qualquer pagamento.",
  "Confirma a matrícula, o livrete (DUA) e o histórico de inspeções (IPO).",
  "Desconfia de preços muito abaixo do mercado — comparamos cada anúncio com a mediana.",
  "Nunca envies dinheiro por adiantado nem uses transferências para desconhecidos.",
  "Faz um test drive e, se possível, uma inspeção pré-compra num centro independente.",
  "Confirma que não há dívidas, penhoras ou reservas de propriedade associadas.",
];
const SELL = [
  "Combina o encontro num local público e movimentado.",
  "Confirma o pagamento antes de entregar o carro e as chaves.",
  "Prepara o requerimento de mudança de propriedade no IMT/registo automóvel.",
  "Guarda cópia do comprovativo de venda e do documento do comprador.",
];

const TRUST = [
  [
    "Anúncios moderados",
    "Os anúncios de particulares passam por validação da equipa antes de ficarem visíveis.",
  ],
  [
    "Origem identificada",
    "Os anúncios agregados de outros sites mostram sempre a fonte e ligam ao anúncio original.",
  ],
  [
    "Preço transparente",
    "Cada carro é comparado com a mediana de mercado — sabes se é bom preço ou caro.",
  ],
  [
    "Reportar é fácil",
    "Encontraste algo suspeito? Reporta o anúncio e a equipa analisa.",
  ],
];

export default function Seguranca() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(920px,92%)] py-9">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Segurança</b>
        </nav>
        <h1 className="font-head text-[2.2rem] font-extrabold text-ink">
          Comprar e vender em segurança
        </h1>
        <p className="mt-2 max-w-2xl text-n2muted">
          O {SITE_NAME} liga compradores e vendedores, mas a negociação e o
          pagamento fazem-se diretamente entre as partes. Segue estas boas
          práticas para uma transação tranquila.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {TRUST.map(([t, d]) => (
            <div key={t} className="n2-card flex gap-3 p-5">
              <span className="text-olive">🛡</span>
              <div>
                <h2 className="font-head text-[1.05rem] font-bold text-ink">
                  {t}
                </h2>
                <p className="text-[0.9rem] text-n2muted">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            Se estás a comprar
          </h2>
          <ul className="n2-card space-y-2 p-6 text-[0.95rem] text-ink/90">
            {BUY.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-clay">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            Se estás a vender
          </h2>
          <ul className="n2-card space-y-2 p-6 text-[0.95rem] text-ink/90">
            {SELL.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-clay">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <div className="n2-card mt-8 bg-[#FBF3DC] p-6 text-center">
          <h2 className="font-head text-[1.2rem] font-extrabold text-ink">
            Viste um anúncio suspeito?
          </h2>
          <p className="mt-1 text-n2muted">
            Usa o botão “Reportar anúncio” na página do carro, ou escreve-nos.
          </p>
          <a
            href="mailto:ajuda@nacional-2.pt?subject=Reportar%20anúncio%20suspeito"
            className="btn-line btn-sm mt-3 inline-flex"
          >
            Contactar a equipa
          </a>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
