"use client";

// Botão "Reportar anúncio" — abre email pré-preenchido (sem backend).
const REPORT_EMAIL = "ajuda@nacional-2.pt";

export default function ReportButton({
  kind,
  id,
  title,
}: {
  kind: "car" | "listing";
  id: string;
  title?: string;
}) {
  const path = kind === "car" ? `/carros/${id}` : `/carros/externo/${id}`;
  const url =
    typeof window !== "undefined"
      ? window.location.origin + path
      : `https://www.nacional-2.pt${path}`;
  const subject = encodeURIComponent(`Reportar anúncio: ${title ?? id}`);
  const body = encodeURIComponent(
    `Quero reportar este anúncio:\n${url}\n\nMotivo:\n`
  );

  return (
    <a
      href={`mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`}
      className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-n2muted2 hover:text-clay"
    >
      ⚑ Reportar anúncio
    </a>
  );
}
