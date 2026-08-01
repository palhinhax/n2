// Gerador e publicador de posts de Instagram a partir de um anúncio.
//
// Funciona em dois modos:
//  - manual: o admin gera a imagem (PNG 1080x1350) + legenda e descarrega para
//    publicar à mão. Não precisa de nenhuma configuração.
//  - API: publica direto no Instagram via Graph API. Requer uma conta
//    Instagram Business/Creator ligada a uma Página de Facebook e as env vars
//    IG_USER_ID + IG_ACCESS_TOKEN (token de longa duração).
import { prisma } from "@/lib/prisma";
import { fmtEur } from "@/lib/constants";
import { SITE_URL } from "@/lib/seo";

const GRAPH = `https://graph.facebook.com/${process.env.IG_GRAPH_VERSION || "v21.0"}`;

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
  return !!(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN);
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

// ---------------------------------------------------------------------------
// Publicação via Graph API
// ---------------------------------------------------------------------------

async function graph(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({
    ...params,
    access_token: process.env.IG_ACCESS_TOKEN!,
  });
  const res = await fetch(`${GRAPH}/${path}`, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      json?.error?.message || `Instagram Graph API ${res.status}`
    );
  }
  return json;
}

async function containerStatus(creationId: string): Promise<string> {
  const url = `${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(
    process.env.IG_ACCESS_TOKEN!
  )}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  return json?.status_code || "ERROR";
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
  const igUser = process.env.IG_USER_ID!;

  // 1) contentor de media
  const container = await graph(`${igUser}/media`, {
    image_url: imageUrl,
    caption: caption.slice(0, IG_CAPTION_MAX),
  });
  const creationId: string = container.id;

  // 2) esperar que o Instagram descarregue e processe a imagem
  for (let i = 0; i < 12; i++) {
    const status = await containerStatus(creationId);
    if (status === "FINISHED") break;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`O Instagram rejeitou a imagem (${status}).`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 3) publicar
  const published = await graph(`${igUser}/media_publish`, {
    creation_id: creationId,
  });
  const mediaId: string = published.id;

  // 4) permalink (best-effort — a publicação já foi feita)
  let permalink: string | null = null;
  try {
    const res = await fetch(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(
        process.env.IG_ACCESS_TOKEN!
      )}`
    );
    const json = await res.json();
    permalink = json?.permalink ?? null;
  } catch {
    permalink = null;
  }

  return { mediaId, permalink };
}
