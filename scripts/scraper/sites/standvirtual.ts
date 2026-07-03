import { fetchText } from "../http";
import { findDeep, intFrom, pick } from "../parse";
import type { Listing, PageResult, SiteAdapter } from "../types";

/**
 * Standvirtual.com — o site é Next.js com SSR: cada página de listagem inclui
 * um <script id="__NEXT_DATA__"> com os resultados da pesquisa (GraphQL urql cache).
 */

const BASE = "https://www.standvirtual.com/carros";
const PER_PAGE = 32;

interface SvCursor {
  page: number;
  totalPages: number | null;
}

interface SvEdge {
  node?: {
    id?: string | number;
    url?: string;
    title?: string;
    shortDescription?: string;
    createdAt?: string;
    parameters?: { key?: string; displayValue?: string; value?: string }[];
    price?: { amount?: { units?: number; value?: number } };
    location?: { city?: { name?: string }; region?: { name?: string } };
    thumbnail?: { x1?: string; x2?: string } | null;
    photos?: { nodes?: { url?: string }[] } | null;
    sellerLink?: { name?: string; type?: string } | null;
  };
}

function extractNextData(html: string): unknown {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m)
    throw new Error(
      "[Standvirtual] __NEXT_DATA__ não encontrado — o layout do site mudou?"
    );
  return JSON.parse(m[1]);
}

/** O urqlState guarda cada resposta GraphQL como string JSON; procura a que tem advertSearch. */
function extractSearch(nextData: unknown): {
  edges: SvEdge[];
  totalCount: number;
} {
  const urqlState = findDeep(nextData, "urqlState") as
    Record<string, { data?: string }> | undefined;
  if (urqlState && typeof urqlState === "object") {
    for (const entry of Object.values(urqlState)) {
      if (!entry?.data || typeof entry.data !== "string") continue;
      try {
        const parsed = JSON.parse(entry.data);
        const search = parsed?.advertSearch;
        if (search?.edges) {
          return {
            edges: search.edges as SvEdge[],
            totalCount: search.totalCount ?? 0,
          };
        }
      } catch {
        /* ignora entradas que não são JSON */
      }
    }
  }
  // fallback: procura advertSearch em qualquer sítio do __NEXT_DATA__
  const search = findDeep(nextData, "advertSearch") as
    { edges?: SvEdge[]; totalCount?: number } | undefined;
  if (search?.edges)
    return { edges: search.edges, totalCount: search.totalCount ?? 0 };
  throw new Error(
    "[Standvirtual] advertSearch não encontrado no __NEXT_DATA__"
  );
}

function collectImages(node: NonNullable<SvEdge["node"]>): string[] {
  const urls = new Set<string>();
  for (const p of node.photos?.nodes ?? []) if (p?.url) urls.add(p.url);
  if (node.thumbnail?.x2) urls.add(node.thumbnail.x2);
  else if (node.thumbnail?.x1) urls.add(node.thumbnail.x1);
  return Array.from(urls);
}

function mapEdge(edge: SvEdge): Listing | null {
  const node = edge.node;
  if (!node?.url || !node.title || node.id == null) return null;

  const params: Record<string, string> = {};
  for (const p of node.parameters ?? []) {
    if (p?.key) params[p.key] = String(p.displayValue ?? p.value ?? "");
  }

  const priceRaw =
    node.price?.amount?.units ??
    node.price?.amount?.value ??
    pick(params, ["price"]);

  return {
    source: "STANDVIRTUAL",
    externalId: String(node.id),
    url: node.url,
    title: node.title,
    brand: pick(params, ["make", "marca"]),
    model: pick(params, ["model", "modelo"]),
    year: intFrom(pick(params, ["first_registration_year", "year", "ano"])),
    km: intFrom(pick(params, ["mileage", "quilometros"])),
    fuel: pick(params, ["fuel_type", "combustivel"]),
    gearbox: pick(params, ["gearbox", "caixa"]),
    power: intFrom(pick(params, ["engine_power", "potencia"])),
    displacement: intFrom(pick(params, ["engine_capacity", "cilindrada"])),
    price: intFrom(priceRaw),
    location:
      [node.location?.city?.name, node.location?.region?.name]
        .filter(Boolean)
        .join(", ") || null,
    sellerType: node.sellerLink?.type ?? null,
    sellerName: node.sellerLink?.name ?? null,
    imageUrls: collectImages(node),
  };
}

export const standvirtual: SiteAdapter = {
  name: "STANDVIRTUAL",
  async scrapePage(cursorRaw: unknown): Promise<PageResult> {
    const cursor: SvCursor = (cursorRaw as SvCursor) ?? {
      page: 1,
      totalPages: null,
    };
    const url = cursor.page === 1 ? BASE : `${BASE}?page=${cursor.page}`;
    const html = await fetchText(url);
    const { edges, totalCount } = extractSearch(extractNextData(html));

    const items = edges.map(mapEdge).filter((x): x is Listing => x !== null);
    const totalPages =
      cursor.totalPages ?? Math.max(1, Math.ceil(totalCount / PER_PAGE));
    const finished = items.length === 0 || cursor.page >= totalPages;

    return {
      items,
      nextCursor: finished ? null : { page: cursor.page + 1, totalPages },
    };
  },
};
// EOF
