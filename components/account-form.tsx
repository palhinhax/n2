"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISTRICTS } from "@/lib/constants";
import HoursEditor from "@/components/hours-editor";

export default function AccountForm({ user }: { user: any }) {
  const router = useRouter();
  const [f, setF] = useState<any>({
    accountType: user.accountType || "PARTICULAR",
    name: user.name || "",
    phone: user.phone || "",
    district: user.district || "",
    address: user.address || "",
    postalCode: user.postalCode || "",
    city: user.city || "",
    bio: user.bio || "",
    standName: user.standName || "",
    nif: user.nif || "",
    website: user.website || "",
    hours: user.hours || "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl || "");
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msg, setMsg] = useState("");
  const isStand = f.accountType === "STAND";

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setUploadingAvatar(false);
    if (res.status === 501 || j.configured === false) {
      setMsg("⚠ Armazenamento de imagens não configurado (.env).");
      return;
    }
    if (res.ok && j.publicUrl) setAvatarUrl(j.publicUrl);
    else setMsg(j.error || "Erro no upload da imagem.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, avatarUrl: avatarUrl || null }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error || "Erro ao guardar.");
      return;
    }
    setMsg("Guardado ✓");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="n2-card flex flex-col gap-5 p-6">
      {/* tipo de conta */}
      <div>
        <label className="flabel">Tipo de conta</label>
        <div className="mt-1 flex gap-2">
          {[
            ["PARTICULAR", "Particular"],
            ["STAND", "Stand / Profissional"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setF({ ...f, accountType: v })}
              className={`n2-chip ${
                f.accountType === v ? "!border-clay !bg-clay !text-white" : ""
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* foto de perfil / logo */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-outline bg-cream">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-n2muted">
              {isStand ? "🏢" : "👤"}
            </div>
          )}
        </div>
        <div>
          <label className="btn-line btn-sm cursor-pointer">
            {uploadingAvatar
              ? "A enviar…"
              : isStand
                ? "Logótipo do stand"
                : "Foto de perfil"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadAvatar}
              disabled={uploadingAvatar}
            />
          </label>
          {avatarUrl && (
            <button
              type="button"
              className="ml-2 text-[0.8rem] font-semibold text-red-700"
              onClick={() => setAvatarUrl("")}
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {isStand && (
          <div className="sm:col-span-2">
            <label className="flabel">Nome do stand *</label>
            <input
              className="finput"
              value={f.standName}
              onChange={(e) => setF({ ...f, standName: e.target.value })}
              placeholder="ex: Auto Estrada Nacional"
            />
          </div>
        )}
        <div>
          <label className="flabel">{isStand ? "Responsável" : "Nome"}</label>
          <input
            className="finput"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div>
          <label className="flabel">Telefone</label>
          <input
            className="finput"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            placeholder="ex: 912 345 678"
          />
        </div>

        {isStand && (
          <>
            <div>
              <label className="flabel">NIF</label>
              <input
                className="finput"
                value={f.nif}
                onChange={(e) => setF({ ...f, nif: e.target.value })}
              />
            </div>
            <div>
              <label className="flabel">Website</label>
              <input
                className="finput"
                value={f.website}
                onChange={(e) => setF({ ...f, website: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flabel">Horário de funcionamento</label>
              <HoursEditor
                value={f.hours}
                onChange={(json) =>
                  setF((prev: any) => ({ ...prev, hours: json }))
                }
              />
              <p className="mt-1 text-[0.78rem] text-n2muted2">
                Marca os dias abertos e as horas. Podes ter mais do que um
                período por dia (ex. manhã e tarde).
              </p>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className="flabel">Morada</label>
          <input
            className="finput"
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
            placeholder="Rua, número"
          />
        </div>
        <div>
          <label className="flabel">Código postal</label>
          <input
            className="finput"
            value={f.postalCode}
            onChange={(e) => setF({ ...f, postalCode: e.target.value })}
            placeholder="0000-000"
          />
        </div>
        <div>
          <label className="flabel">Localidade</label>
          <input
            className="finput"
            value={f.city}
            onChange={(e) => setF({ ...f, city: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flabel">Distrito</label>
          <select
            className="finput"
            value={f.district}
            onChange={(e) => setF({ ...f, district: e.target.value })}
          >
            <option value="">Escolhe…</option>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="flabel">
            {isStand ? "Sobre o stand" : "Sobre mim"}
          </label>
          <textarea
            className="finput"
            rows={4}
            value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
            placeholder={
              isStand
                ? "Apresentação do stand, serviços, garantias…"
                : "Uma breve apresentação…"
            }
          />
        </div>
      </div>

      {msg && <p className="text-[0.9rem] font-semibold text-bark">{msg}</p>}
      <button type="submit" disabled={busy} className="btn-clay">
        {busy ? "A guardar…" : "Guardar alterações ✓"}
      </button>
    </form>
  );
}
