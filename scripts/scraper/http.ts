const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
};

/** Referer/Origin do próprio site — APIs internas (OLX, etc.) exigem-nos. */
function originHeaders(url: string): Record<string, string> {
  try {
    const u = new URL(url);
    return { Referer: `${u.origin}/`, Origin: u.origin };
  } catch {
    return {};
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** delay base entre pedidos (+ jitter) — sê educado com os sites */
export const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 700);

export async function politeDelay() {
  await sleep(DELAY_MS + Math.floor(Math.random() * 400));
}

async function fetchRaw(
  url: string,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...BASE_HEADERS, ...originHeaders(url), ...extraHeaders },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 403 || res.status === 429) {
        throw new Error(
          `HTTP ${res.status} em ${url} — provável bloqueio anti-bot / rate limit. ` +
            `Aumenta SCRAPE_DELAY_MS ou tenta mais tarde.`
        );
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetchRaw(url);
  return res.text();
}

export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetchRaw(url, { Accept: "application/json" });
  return (await res.json()) as T;
}
