import { execFile } from "node:child_process";

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
        const e = new Error(
          `HTTP ${res.status} em ${url} — provável bloqueio anti-bot / rate limit. ` +
            `Aumenta SCRAPE_DELAY_MS ou tenta mais tarde.`
        ) as Error & { status: number };
        e.status = res.status;
        throw e;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      // 403 anti-bot não se resolve com retry imediato
      if ((err as { status?: number }).status === 403) break;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Fallback via curl do sistema: alguns sites (PiscaPisca) estão atrás de
// Cloudflare com bot management que bloqueia o fetch do Node pelo fingerprint
// TLS (undici), mas aceita o curl com os mesmos headers. Depois do primeiro
// 403 contornado, os pedidos seguintes a esse host vão direto ao curl.
// Se o curl não existir no ambiente (ex.: serverless), mantém-se o erro
// original — o comportamento fica igual ao de antes do fallback.
// ---------------------------------------------------------------------------

const curlFirstHosts = new Set<string>();

function curlOnce(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "-sS",
      "--fail",
      "-L",
      "--max-time",
      "30",
      "-H",
      `User-Agent: ${UA}`,
      "-H",
      `Accept: ${BASE_HEADERS.Accept}`,
      "-H",
      `Accept-Language: ${BASE_HEADERS["Accept-Language"]}`,
      url,
    ];
    execFile(
      "curl",
      args,
      { maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            reject(
              Object.assign(
                new Error("curl não está disponível neste ambiente"),
                {
                  curlMissing: true,
                }
              )
            );
            return;
          }
          reject(
            new Error(`curl falhou em ${url}: ${stderr.trim() || err.message}`)
          );
          return;
        }
        resolve(stdout);
      }
    );
  });
}

async function fetchTextViaCurl(url: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await curlOnce(url);
    } catch (err) {
      lastErr = err;
      if ((err as { curlMissing?: boolean }).curlMissing) throw err;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

export async function fetchText(url: string): Promise<string> {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  })();
  if (host && curlFirstHosts.has(host)) return fetchTextViaCurl(url);

  try {
    const res = await fetchRaw(url);
    return res.text();
  } catch (err) {
    if ((err as { status?: number }).status !== 403) throw err;
    let text: string;
    try {
      text = await fetchTextViaCurl(url);
    } catch (curlErr) {
      console.warn(`[http] fallback curl também falhou: ${curlErr}`);
      throw err; // o erro original (403) é o mais informativo
    }
    if (host) {
      curlFirstHosts.add(host);
      console.log(
        `[http] ${host}: fetch do Node bloqueado (403) — a usar curl daqui em diante`
      );
    }
    return text;
  }
}

export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetchRaw(url, { Accept: "application/json" });
  return (await res.json()) as T;
}
