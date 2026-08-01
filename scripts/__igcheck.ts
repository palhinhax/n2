import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} } as any);

const V = process.env.IG_GRAPH_VERSION?.trim() || "v21.0";
const T = (process.env.IG_ACCESS_TOKEN || "").trim();
const CONFIGURED = (process.env.IG_USER_ID || "").trim();

async function get(path: string, fields: string) {
  const r = await fetch(
    `https://graph.instagram.com/${V}/${path}?fields=${fields}&access_token=${encodeURIComponent(T)}`
  );
  const j = await r.json().catch(() => ({}));
  return `${r.status} ${JSON.stringify(j).slice(0, 200)}`;
}

(async () => {
  console.log("IG_USER_ID configurado:", CONFIGURED, "| token len:", T.length);
  console.log("me           →", await get("me", "id,username,account_type"));
  console.log("configurado  →", await get(CONFIGURED, "id,username"));
  console.log("id inventado →", await get("99999999999999999", "id,username"));
})().then(() => process.exit(0));
