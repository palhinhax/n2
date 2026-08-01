// Render do post de Instagram (PNG 1080x1350, o formato 4:5 do feed).
//
// Usa o `next/og` (satori + resvg) que já vem com o Next — sem dependências
// novas. O satori só sabe layout flex, por isso todos os blocos são flex
// explícitos.
import { ImageResponse } from "next/og";
import type { IgSubject } from "@/lib/instagram";
import { fmtEur } from "@/lib/constants";

export const IG_WIDTH = 1080;
export const IG_HEIGHT = 1350;

const C = {
  cream: "#FBF6EA",
  ink: "#1F1D18",
  olive: "#414D11",
  clay: "#CE994B",
  bark: "#624E1C",
  stone2: "#F5DBB3",
  muted: "#6E6350",
};

/**
 * Descarrega a foto e devolve-a como data URL. Fazemos o fetch nós (em vez de
 * dar o URL ao satori) por dois motivos: os CDNs de origem bloqueiam hotlink
 * de clientes desconhecidos, e o satori não descodifica WebP — assim podemos
 * detetar e cair para o cartão sem foto em vez de rebentar o render.
 */
async function fetchPhoto(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: {
        // alguns CDNs devolvem 403 sem UA/referer de browser
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "image/jpeg,image/png,image/*;q=0.8",
      },
      // não vale a pena esperar muito por uma foto
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!/image\/(jpeg|jpg|png)/.test(type)) return null; // webp/avif: sem sorte
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8_000_000) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function specLine(s: IgSubject): string[] {
  return [
    s.year ? String(s.year) : null,
    s.km != null ? `${s.km.toLocaleString("pt-PT")} km` : null,
    s.fuel,
    s.gearbox,
    s.power ? `${s.power} cv` : null,
  ].filter((v): v is string => !!v);
}

/** Gera o PNG do post. Devolve uma `ImageResponse` (Response com o PNG). */
export async function renderInstagramImage(
  s: IgSubject,
  opts: { badge?: string | null } = {}
) {
  const photo = await fetchPhoto(s.photoUrl);
  const specs = specLine(s);
  const badge = opts.badge ?? (s.source ? `via ${s.source}` : "No Nacional 2");
  const headline = [s.brand, s.model].filter(Boolean).join(" ") || s.title;
  const sub = s.version || specs.slice(0, 2).join(" · ");

  return new ImageResponse(
    <div
      style={{
        width: IG_WIDTH,
        height: IG_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: C.cream,
        fontFamily: "sans-serif",
      }}
    >
      {/* ---- foto ---- */}
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: 820,
          backgroundColor: C.stone2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={photo}
            width={IG_WIDTH}
            height={820}
            style={{ width: IG_WIDTH, height: 820, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              backgroundColor: C.stone2,
            }}
          >
            <div style={{ fontSize: 160 }}>🚗</div>
            <div style={{ fontSize: 40, color: C.bark, fontWeight: 700 }}>
              {headline}
            </div>
          </div>
        )}

        {/* selo de origem */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 40,
            left: 40,
            backgroundColor: C.ink,
            color: C.cream,
            padding: "12px 26px",
            borderRadius: 999,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>

        {/* preço sobre a foto */}
        {s.price ? (
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 40,
              right: 40,
              backgroundColor: C.clay,
              color: "#FFFFFF",
              padding: "16px 34px",
              borderRadius: 20,
              fontSize: 62,
              fontWeight: 800,
            }}
          >
            {fmtEur(s.price)}
          </div>
        ) : null}
      </div>

      {/* ---- painel de informação ---- */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "48px 56px 40px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 800,
            color: C.ink,
            lineHeight: 1.05,
          }}
        >
          {headline}
        </div>
        {sub ? (
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: C.muted,
              marginTop: 10,
            }}
          >
            {sub}
          </div>
        ) : null}

        {/* specs em pastilhas */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 28,
          }}
        >
          {specs.map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                backgroundColor: "#FFFFFF",
                border: `2px solid ${C.stone2}`,
                color: C.bark,
                borderRadius: 999,
                padding: "10px 24px",
                fontSize: 30,
                fontWeight: 600,
                marginRight: 14,
                marginBottom: 14,
              }}
            >
              {t}
            </div>
          ))}
        </div>

        {/* rodapé */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            borderTop: `3px solid ${C.stone2}`,
            paddingTop: 26,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 800,
              color: C.olive,
            }}
          >
            nacional2.pt
          </div>
          <div style={{ display: "flex", fontSize: 28, color: C.muted }}>
            {s.location || "Portugal"}
          </div>
        </div>
      </div>
    </div>,
    { width: IG_WIDTH, height: IG_HEIGHT }
  );
}
