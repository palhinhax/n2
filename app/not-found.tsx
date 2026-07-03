import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#17120e]">
      <Image
        src="/brand/404.png"
        alt="Marco da Nacional 2 em Castro Daire com a indicação de página não encontrada"
        fill
        priority
        sizes="100vw"
        className="object-contain object-top md:object-cover md:object-center"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#17120e] via-transparent to-transparent md:bg-gradient-to-br md:from-transparent md:via-transparent md:to-[#17120e]/55" />

      <Card className="absolute inset-x-4 bottom-5 z-10 mx-auto max-w-sm rounded-2xl border border-[#E7D7B6]/80 bg-[#FCF7EC]/90 shadow-warmlg backdrop-blur-md md:inset-x-auto md:bottom-8 md:right-8 md:mx-0 md:w-[23rem]">
        <CardHeader className="space-y-1 pb-3">
          <div className="font-head text-sm font-extrabold tracking-[0.14em] text-clay">
            NACIONAL 2
          </div>
          <CardTitle className="text-2xl font-bold text-ink">
            O caminho acaba aqui.
          </CardTitle>
          <CardDescription className="text-n2muted">
            Esta página mudou de destino ou já não está disponível.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 border-outline2 bg-cream/70"
          >
            <Link href="/carros">
              <CarFront className="mr-2 h-4 w-4" />
              Ver carros
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
