import Link from "next/link";
import Milestone from "@/components/milestone";
import NorthSailCredit from "@/components/northsail-credit";

export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink py-10 text-[#C9BFA6]">
      <div className="mx-auto w-[min(1240px,94%)]">
        <div className="mb-7 grid grid-cols-2 gap-7 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-2 flex items-center gap-2">
              <Milestone className="w-[28px]" />
              <span className="font-head text-[1.2rem] font-extrabold text-stone2">
                NACIONAL 2
              </span>
            </div>
            <p className="max-w-[34ch] text-[0.88rem]">
              O marketplace de carros 100% grátis. Feito em Portugal, do km 0 ao
              km 739.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-head text-[0.92rem] uppercase tracking-widest text-sand">
              Comprar
            </h4>
            <ul className="space-y-1 text-[0.92rem]">
              <li>
                <Link href="/carros" className="hover:text-stone2">
                  Carros usados
                </Link>
              </li>
              <li>
                <Link
                  href="/carros?fuel=El%C3%A9trico"
                  className="hover:text-stone2"
                >
                  Elétricos
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-head text-[0.92rem] uppercase tracking-widest text-sand">
              Vender
            </h4>
            <ul className="space-y-1 text-[0.92rem]">
              <li>
                <Link href="/garagem/novo" className="hover:text-stone2">
                  Anunciar grátis
                </Link>
              </li>
              <li>
                <Link href="/garagem" className="hover:text-stone2">
                  A minha garagem
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-head text-[0.92rem] uppercase tracking-widest text-sand">
              Conta
            </h4>
            <ul className="space-y-1 text-[0.92rem]">
              <li>
                <Link href="/auth/login" className="hover:text-stone2">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-stone2">
                  Criar conta
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone2/15 pt-4 text-[0.8rem] text-[#8F866F]">
          <p className="mb-3 max-w-[60ch]">
            Este site foi construído e é gerido pela{" "}
            <a
              href="https://www.north-sail.com/?utm_source=nacional2&utm_medium=content&utm_campaign=made-by-northsail"
              target="_blank"
              rel="noopener"
              className="text-stone2 underline underline-offset-2 hover:text-white"
            >
              NorthSail
            </a>
            , plataforma de websites e web apps para negócios locais.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© 2026 Nacional 2 — feito com ☀ na EN2</span>
            <div className="flex items-center gap-4">
              <NorthSailCredit variant="dark" />
              <span>PT · €</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
