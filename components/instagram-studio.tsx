"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  drawInstagramPost,
  canvasToBlob,
  type IgCanvasData,
} from "@/lib/instagram-canvas";

const CAPTION_MAX = 2200;

type Fields = Omit<IgCanvasData, "badge" | "photoUrl">;

export default function InstagramStudio({
  kind,
  id,
  title,
  fields,
  defaultCaption,
  defaultBadge,
  hasPhoto,
  apiEnabled,
}: {
  kind: "car" | "listing";
  id: string;
  title: string;
  fields: Fields;
  defaultCaption: string;
  defaultBadge: string;
  hasPhoto: boolean;
  apiEnabled: boolean;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [badge, setBadge] = useState(defaultBadge);
  const [drawing, setDrawing] = useState(true);
  const [photoOk, setPhotoOk] = useState(true);
  const [busy, setBusy] = useState<null | "ai" | "download" | "publish">(null);
  const [publishArmed, setPublishArmed] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  const redraw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    const ok = await drawInstagramPost(canvas, {
      ...fields,
      badge,
      photoUrl: hasPhoto
        ? `/api/admin/instagram/photo?kind=${kind}&id=${id}`
        : null,
    });
    setPhotoOk(!hasPhoto || ok);
    setDrawing(false);
  }, [fields, badge, hasPhoto, kind, id]);

  // redesenha quando muda o anúncio ou o selo (com um respiro para não
  // redesenhar a cada tecla)
  useEffect(() => {
    const t = setTimeout(redraw, 250);
    return () => clearTimeout(t);
  }, [redraw]);

  useEffect(() => {
    if (!publishArmed) return;
    const t = setTimeout(() => setPublishArmed(false), 6000);
    return () => clearTimeout(t);
  }, [publishArmed]);

  useEffect(() => {
    setPublishArmed(false);
  }, [kind, id, caption, badge]);

  async function generateCaption() {
    setBusy("ai");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/instagram/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falhou.");
      setCaption(j.caption);
      setMsg({
        kind: "ok",
        text: j.ai
          ? "Legenda gerada com IA."
          : "IA indisponível — usei a legenda automática.",
      });
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setBusy(null);
    }
  }

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
      a.download = `n2-${kind}-${id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);

      // regista no histórico (publicação manual)
      await fetch("/api/admin/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, caption, mode: "manual" }),
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
        text: `Clica outra vez para publicar "${title}" no Instagram.`,
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
        body: JSON.stringify({ kind, id, caption, image, mode: "api" }),
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
      {/* pré-visualização — é o próprio ficheiro que sai */}
      <div>
        <div className="overflow-hidden rounded-xl border border-outline bg-stone2">
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ aspectRatio: "1080 / 1350" }}
          />
        </div>
        <div className="mt-2 text-center text-[0.78rem] text-n2muted2">
          {drawing
            ? "A desenhar…"
            : photoOk
              ? "1080 × 1350 px · formato 4:5 do feed"
              : "⚠ A foto do anúncio não carregou — saiu o cartão sem foto."}
        </div>
      </div>

      {/* controlos */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-head text-[1.35rem] font-extrabold text-ink">
            {title}
          </h2>
          <span className="text-[0.85rem] text-n2muted">
            {kind === "car" ? "Anúncio do site" : "Anúncio externo"}
          </span>
        </div>

        <label className="text-[0.85rem] font-semibold text-ink">
          Selo na imagem
          <input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            maxLength={40}
            className="finput mt-1"
          />
        </label>

        <label className="text-[0.85rem] font-semibold text-ink">
          Legenda
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
            rows={12}
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
            onClick={generateCaption}
            disabled={busy !== null}
          >
            {busy === "ai" ? "A gerar…" : "✨ Gerar legenda com IA"}
          </button>
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
                : "Falta configurar IG_USER_ID / IG_ACCESS_TOKEN"
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
