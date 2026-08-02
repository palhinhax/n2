// Gerador e publicador de posts de Instagram a partir de um anúncio.
//
// Funciona em dois modos:
//  - manual: o admin gera a imagem (PNG 1080x1350) + legenda e descarrega para
//    publicar à mão. Não precisa de nenhuma configuração.
//  - API: publica direto no Instagram via Graph API, com as env vars
//    IG_USER_ID + IG_ACCESS_TOKEN (token de longa duração).
import { prisma } from "@/lib/prisma";
import { fmtEur } from "@/lib/constants";
import { SITE_URL } from "@/lib/seo";

const env = (k: string) => (process.env[k] ?? "").trim();
const igToken = () => env("IG_ACCESS_TOKEN");

/**
 * Há duas APIs da Meta para publicar no Instagram. Os endpoints e parâmetros
 * são iguais, mas o host não — e mandar o token para o host errado dá o
 * enigmático "Cannot parse access token":
 *
 *  - Facebook Login for Business → token "EAA…"  → graph.facebook.com
 *    (conta Instagram ligada a uma Página de Facebook)
 *  - Instagram Login             → token "IGAA…" → graph.instagram.com
 *
 * Escolhemos pelo prefixo do token; IG_GRAPH_HOST força um deles se preciso.
 */
function graphHost() {
  return (
    env("IG_GRAPH_HOST") ||
    (igToken().startsWith("IG") ? "graph.instagram.com" : "graph.facebook.com")
  );
}

function graphBase() {
  return `https://${graphHost()}/${env("IG_GRAPH_VERSION") || "v21.0"}`;
}

/**
 * Nó da conta onde se publica. No Instagram Login o token já identifica a
 * conta e o id certo é o "app-scoped" (que não é o mesmo que o IG Business
 * Account ID) — usar `me` evita ter de descobrir qual é. No Facebook Login é
 * mesmo preciso o IG Business Account ID em IG_USER_ID.
 */
function igNode() {
  return graphHost() === "graph.instagram.com" ? "me" : env("IG_USER_ID");
}

export type IgKind = "car" | "listing";

/** Dados normalizados de um anúncio, iguais para carros do site e externos. */
export interface IgSubject {
  kind: IgKind;
  id: string;
  title: string; // "BMW 320d Touring"
  brand: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
  km: number | null;
  fuel: string | null;
  gearbox: string | null;
  power: number | null;
  price: number | null;
  location: string | null;
  /** melhor foto disponível (pode não existir) */
  photoUrl: string | null;
  /** link a apontar para a página no Nacional 2 */
  pageUrl: string;
  /** origem do anúncio: null = anúncio do próprio site */
  source: string | null;
}

export function instagramConfigured() {
  if (!igToken()) return false;
  // o Facebook Login precisa do id da conta; o Instagram Login não
  return graphHost() === "graph.instagram.com" || !!env("IG_USER_ID");
}

function firstImage(imageUrls: string): string | null {
  try {
    const arr = JSON.parse(imageUrls);
    return Array.isArray(arr) && typeof arr[0] === "string" ? arr[0] : null;
  } catch {
    return null;
  }
}

/** Carrega um anúncio (do site ou externo) no formato comum. */
export async function loadSubject(
  kind: IgKind,
  id: string
): Promise<IgSubject | null> {
  if (kind === "car") {
    const c = await prisma.car.findUnique({
      where: { id },
      include: {
        brand: true,
        model: true,
        photos: { orderBy: { position: "asc" }, take: 1 },
      },
    });
    if (!c) return null;
    return {
      kind: "car",
      id: c.id,
      title: [c.brand.name, c.model.name, c.version].filter(Boolean).join(" "),
      brand: c.brand.name,
      model: c.model.name,
      version: c.version,
      year: c.year,
      km: c.km,
      fuel: c.fuel,
      gearbox: c.gearbox,
      power: c.power,
      price: c.price,
      location: c.district,
      photoUrl: c.photos[0]?.url ?? null,
      pageUrl: `${SITE_URL}/carros/${c.id}`,
      source: null,
    };
  }

  const l = await prisma.scrapedListing.findUnique({ where: { id } });
  if (!l) return null;
  return {
    kind: "listing",
    id: l.id,
    title: l.title,
    brand: l.brand,
    model: l.model,
    version: l.version,
    year: l.year,
    km: l.km,
    fuel: l.fuel,
    gearbox: l.gearbox,
    power: l.power,
    price: l.price,
    location: l.location,
    photoUrl: firstImage(l.imageUrls),
    pageUrl: `${SITE_URL}/carros/externo/${l.id}`,
    source: l.source,
  };
}

/**
 * Campos prontos para o desenho no canvas (ver lib/instagram-canvas.ts).
 * Fica aqui, e não no módulo do canvas, porque é calculado no servidor e
 * passado como props — o módulo do canvas só sabe desenhar.
 */
export function canvasFields(s: IgSubject) {
  return {
    headline: [s.brand, s.model].filter(Boolean).join(" ") || s.title,
    sub: s.version ?? "",
    specs: [
      s.year ? String(s.year) : null,
      s.km != null ? `${s.km.toLocaleString("pt-PT")} km` : null,
      s.fuel,
      s.gearbox,
      s.power ? `${s.power} cv` : null,
    ].filter((v): v is string => !!v),
    price: s.price ? fmtEur(s.price) : null,
    location: s.location || "Portugal",
  };
}

const HASHTAG_BASE = [
  "#nacional2",
  "#carrosusados",
  "#carrosportugal",
  "#standvirtual",
  "#carros",
  "#automovel",
  "#usados",
  "#portugal",
];

const slugTag = (s: string) =>
  "#" +
  s
    .toLowerCase()
    .normalize("NFD") // tira acentos: "Citroën" -> "citroen"
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

/** Hashtags específicas do carro + base, sem repetidas e no máximo 12. */
export function buildHashtags(s: IgSubject): string[] {
  const specific = [
    s.brand ? slugTag(s.brand) : null,
    s.brand && s.model ? slugTag(`${s.brand}${s.model}`) : null,
    s.fuel && /l[ée]tric/i.test(s.fuel) ? "#carroseletricos" : null,
    s.fuel && /h[íi]brid/i.test(s.fuel) ? "#hibrido" : null,
  ].filter((t): t is string => !!t && t.length > 2);
  return Array.from(new Set([...specific, ...HASHTAG_BASE])).slice(0, 12);
}

/**
 * Legenda por omissão — determinística, sem IA. É o texto que aparece
 * pré-preenchido no painel; o admin pode editar ou pedir uma versão à IA.
 */
export function buildCaption(s: IgSubject): string {
  const specs = [
    s.year ? `${s.year}` : null,
    s.km != null ? `${s.km.toLocaleString("pt-PT")} km` : null,
    s.fuel,
    s.gearbox,
    s.power ? `${s.power} cv` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines = [
    `${s.title}${s.price ? ` — ${fmtEur(s.price)}` : ""}`,
    "",
    specs,
    s.location ? `📍 ${s.location}` : null,
    "",
    "Vê o anúncio completo no Nacional 2 — link na bio.",
    "Anunciar é grátis, sem comissões. 🚗",
    "",
    buildHashtags(s).join(" "),
  ].filter((l) => l !== null) as string[];

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const IG_CAPTION_MAX = 2200;

/** Legenda determinística para o post mensal do Índice Nacional 2. */
export function buildIndexCaption(idx: {
  monthLabel: string;
  median: number;
  momPct: number | null;
  activeCount: number;
  fuels: { seg: string; median: number }[];
}): string {
  const FUEL_EMOJI: Record<string, string> = {
    Gasolina: "⛽",
    Diesel: "🛢",
    Elétrico: "⚡",
    Híbrido: "🔋",
    "Híbrido Plug-In": "🔌",
  };
  const mom =
    idx.momPct == null
      ? ""
      : ` (${idx.momPct > 0 ? "+" : ""}${idx.momPct.toLocaleString("pt-PT")}% vs mês anterior)`;
  const lines = [
    `📈 Índice Nacional 2 — ${idx.monthLabel}`,
    "",
    `Preço mediano dos carros usados em Portugal: ${fmtEur(idx.median)}${mom}`,
    "",
    "Por combustível:",
    ...idx.fuels
      .slice(0, 5)
      .map((f) => `${FUEL_EMOJI[f.seg] ?? "•"} ${f.seg} — ${fmtEur(f.median)}`),
    "",
    `Calculado a partir de ${idx.activeCount.toLocaleString("pt-PT")} anúncios ativos, agregados de todos os grandes portais.`,
    "",
    "Índice completo e evolução mês a mês 👉 nacional-2.pt/indice-precos (link na bio)",
    "",
    "#carrosusados #mercadoautomovel #carros #portugal #precosdoscarros #comprarcarro #nacional2",
  ];
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Publicação via Graph API
// ---------------------------------------------------------------------------

async function graphPost(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: igToken() });
  const res = await fetch(`${graphBase()}/${path}`, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Instagram API ${res.status}`);
  }
  return json;
}

async function graphGet(path: string, fields: string) {
  const url = `${graphBase()}/${path}?fields=${encodeURIComponent(
    fields
  )}&access_token=${encodeURIComponent(igToken())}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Instagram API ${res.status}`);
  }
  return json;
}

/**
 * Confirma que o token e a conta respondem, antes de gerar/carregar seja o que
 * for. Devolve o username para o painel mostrar em que conta vai publicar.
 */
export async function checkInstagramAccount() {
  const json = await graphGet(igNode(), "id,username");
  return {
    id: json.id as string,
    username: (json.username ?? null) as string | null,
  };
}

/**
 * Publica uma imagem no Instagram. `imageUrl` tem de ser um URL público
 * (o Instagram vai buscá-lo do lado dele) — por isso a imagem é primeiro
 * carregada para o B2.
 */
export async function publishToInstagram(imageUrl: string, caption: string) {
  if (!instagramConfigured()) {
    throw new Error(
      "Instagram não configurado (falta IG_USER_ID / IG_ACCESS_TOKEN)."
    );
  }
  const igUser = igNode();

  // 1) contentor de media
  const container = await graphPost(`${igUser}/media`, {
    image_url: imageUrl,
    caption: caption.slice(0, IG_CAPTION_MAX),
  });
  const creationId: string = container.id;

  // 2) esperar que o Instagram descarregue e processe a imagem
  for (let i = 0; i < 12; i++) {
    const { status_code } = await graphGet(creationId, "status_code").catch(
      () => ({ status_code: "ERROR" })
    );
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`O Instagram rejeitou a imagem (${status_code}).`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 3) publicar
  const published = await graphPost(`${igUser}/media_publish`, {
    creation_id: creationId,
  });
  const mediaId: string = published.id;

  // 4) permalink (best-effort — a publicação já foi feita)
  let permalink: string | null = null;
  try {
    permalink = (await graphGet(mediaId, "permalink"))?.permalink ?? null;
  } catch {
    permalink = null;
  }

  return { mediaId, permalink };
}
