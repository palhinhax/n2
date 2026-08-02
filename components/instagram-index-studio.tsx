"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  drawIndexPost,
  canvasToBlob,
  type IgIndexData,
} from "@/lib/instagram-canvas";

const CAPTION_MAX = 2200;

// Estúdio do post mensal do Índice Nacional 2 — mesmo fluxo do estúdio de
// anúncios (canvas no browser → download PNG ou publicação via Graph API).
export default function InstagramIndexStudio({
  data,
  defaultCaption,
  apiEnabled,
}: {
  data: IgIndexData;
  defaultCaption: string;
  apiEnabled: boolean;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [drawing, setDrawing] = useState(true);
  const [busy, setBusy] = useState<null | "download" | "publish">(null);
  const [publishArmed, setPublishArmed] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  const redraw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    await drawIndexPost(canvas, data);
    setDrawing(false);
  }, [data]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (!publishArmed) return;
    const t = setTimeout(() => setPublishArmed(false), 6000);
    return () => clearTimeout(t);
  }, [publishArmed]);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setMsg({ kind: "ok", text: "Legenda copiada." });
    } catch {
      setMsg({ kind: "err", text: "O browser não deixou copiar." });
    }
  }

  async function download() {
    if (!canvasRef.current) return;
    setPublishArmed(false);
    setBusy("download");
    setMsg(null);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `n2-indice-${data.monthLabel.replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);

      await fetch("/api/admin/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "indice", caption, mode: "manual" }),
      });
      setMsg({
        kind: "ok",
        text: "Imagem descarregada. Copia a legenda e publica no Instagram.",
      });
      router.refresh();
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!canvasRef.current) return;
    if (!publishArmed) {
      setPublishArmed(true);
      setMsg({
        kind: "err",
        text: "Clica outra vez para publicar o índice no Instagram.",
      });
      return;
    }
    setPublishArmed(false);
    setBusy("publish");
    setMsg(null);
    try {
      // JPEG e não PNG: o content publishing do Instagram só aceita JPEG
      const image = canvasRef.current.toDataURL("image/jpeg", 0.92);
      const res = await fetch("/api/admin/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "indice", caption, image, mode: "api" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falhou a publicação.");
      setMsg({
        kind: "ok",
        text: j.permalink ? `Publicado: ${j.permalink}` : "Publicado ✓",
      });
      router.refresh();
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="n2-card grid gap-6 p-5 md:grid-cols-[360px_1fr]">
      <div>
        <div className="overflow-hidden rounded-xl border border-outline bg-stone2">
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ aspectRatio: "1080 / 1350" }}
          />
        </div>
        <div className="mt-2 text-center text-[0.78rem] text-n2muted2">
          {drawing ? "A desenhar…" : "1080 × 1350 px · formato 4:5 do feed"}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-head text-[1.35rem] font-extrabold text-ink">
            📈 Índice Nacional 2 — {data.monthLabel}
          </h2>
          <p className="text-[0.85rem] text-n2muted">
            Post mensal com os números do mercado. Os dados vêm do índice
            público (/indice-precos) — a imagem é sempre o retrato atual.
          </p>
        </div>

        <label className="text-[0.85rem] font-semibold text-ink">
          Legenda
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
            rows={14}
            className="finput mt-1 w-full font-barlow text-[0.9rem]"
          />
          <span className="text-[0.75rem] font-normal text-n2muted2">
            {caption.length} / {CAPTION_MAX}
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-line btn-xs"
            onClick={copyCaption}
            disabled={busy !== null}
          >
            Copiar legenda
          </button>
        </div>

        <div className="mt-1 flex flex-wrap gap-2 border-t border-outline pt-3">
          <button
            type="button"
            className="btn-olive btn-xs disabled:opacity-50"
            onClick={download}
            disabled={busy !== null || drawing}
          >
            {busy === "download" ? "A preparar…" : "⬇ Descarregar imagem"}
          </button>
          <button
            type="button"
            className={`btn-xs disabled:opacity-50 ${
              publishArmed ? "btn-clay" : "btn-olive"
            }`}
            onClick={publish}
            disabled={busy !== null || drawing || !apiEnabled}
            title={
              apiEnabled
                ? "Publica já no Instagram"
                : "Falta configurar IG_ACCESS_TOKEN"
            }
          >
            {busy === "publish"
              ? "A publicar…"
              : publishArmed
                ? "Confirmar publicação"
                : "📸 Publicar no Instagram"}
          </button>
        </div>

        {msg && (
          <div
            className={`text-[0.85rem] font-semibold ${
              msg.kind === "ok" ? "text-olive" : "text-red-800"
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>
    </section>
  );
}
