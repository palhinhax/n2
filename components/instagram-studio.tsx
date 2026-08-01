"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const CAPTION_MAX = 2200;

export default function InstagramStudio({
  kind,
  id,
  title,
  defaultCaption,
  defaultBadge,
  apiEnabled,
}: {
  kind: "car" | "listing";
  id: string;
  title: string;
  defaultCaption: string;
  defaultBadge: string;
  apiEnabled: boolean;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(defaultCaption);
  const [badge, setBadge] = useState(defaultBadge);
  const [appliedBadge, setAppliedBadge] = useState(defaultBadge);
  const [busy, setBusy] = useState<null | "ai" | "download" | "publish">(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  const imageUrl = useMemo(
    () =>
      `/api/admin/instagram/image?kind=${kind}&id=${id}&badge=${encodeURIComponent(
        appliedBadge
      )}`,
    [kind, id, appliedBadge]
  );

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
    await navigator.clipboard.writeText(caption);
    setMsg({ kind: "ok", text: "Legenda copiada." });
  }

  async function download() {
    setBusy("download");
    setMsg(null);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("Não foi possível gerar a imagem.");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `n2-${kind}-${id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);

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
    if (
      !confirm(
        `Publicar "${title}" no Instagram agora?\n\nIsto publica no perfil, não é possível desfazer aqui.`
      )
    )
      return;
    setBusy("publish");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          id,
          caption,
          badge: appliedBadge,
          mode: "api",
        }),
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
    <section className="n2-card grid gap-6 p-5 md:grid-cols-[380px_1fr]">
      {/* pré-visualização */}
      <div>
        <div className="overflow-hidden rounded-xl border border-outline bg-stone2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Pré-visualização do post de ${title}`}
            className="block w-full"
          />
        </div>
        <div className="mt-2 text-center text-[0.78rem] text-n2muted2">
          1080 × 1350 px · formato 4:5 do feed
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
          <div className="mt-1 flex gap-2">
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              maxLength={40}
              className="finput flex-1"
            />
            <button
              type="button"
              className="btn-line btn-sm"
              onClick={() => setAppliedBadge(badge)}
              disabled={badge === appliedBadge}
            >
              Aplicar
            </button>
          </div>
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
            className="btn-line btn-sm"
            onClick={generateCaption}
            disabled={busy !== null}
          >
            {busy === "ai" ? "A gerar…" : "✨ Gerar legenda com IA"}
          </button>
          <button
            type="button"
            className="btn-line btn-sm"
            onClick={copyCaption}
            disabled={busy !== null}
          >
            Copiar legenda
          </button>
        </div>

        <div className="mt-1 flex flex-wrap gap-2 border-t border-outline pt-3">
          <button
            type="button"
            className="btn-olive btn-sm"
            onClick={download}
            disabled={busy !== null}
          >
            {busy === "download" ? "A preparar…" : "⬇ Descarregar imagem"}
          </button>
          <button
            type="button"
            className="btn-olive btn-sm disabled:opacity-50"
            onClick={publish}
            disabled={busy !== null || !apiEnabled}
            title={
              apiEnabled
                ? "Publica já no Instagram"
                : "Falta configurar IG_USER_ID / IG_ACCESS_TOKEN"
            }
          >
            {busy === "publish" ? "A publicar…" : "📸 Publicar no Instagram"}
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
