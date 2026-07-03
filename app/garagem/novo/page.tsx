import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import NewCarForm from "@/components/new-car-form";

export const dynamic = "force-dynamic";

export default function NovoCarro() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(760px,94%)] py-8">
        <h1 className="text-center font-head text-[2rem] font-extrabold text-ink">
          Adicionar carro à garagem
        </h1>
        <p className="mb-6 text-center text-n2muted">
          Podes vender já, ou guardar só para ti — com lembretes de IPO, seguro
          e manutenção.
        </p>
        <NewCarForm />
      </div>
      <SiteFooter />
    </div>
  );
}
