const V = process.env.IG_GRAPH_VERSION?.trim() || "v21.0";
const T = (process.env.IG_ACCESS_TOKEN || "").trim();
const CONFIGURED = (process.env.IG_USER_ID || "").trim();

async function get(path: string, fields: string) {
  const r = await fetch(
    `https://graph.instagram.com/${V}/${path}?fields=${fields}&access_token=${encodeURIComponent(T)}`
  );
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: JSON.stringify(j).slice(0, 220) };
}

(async () => {
  console.log("IG_USER_ID configurado:", CONFIGURED);
  console.log(
    "me            →",
    JSON.stringify(await get("me", "id,username,account_type"))
  );
  console.log(
    "configurado   →",
    JSON.stringify(await get(CONFIGURED, "id,username"))
  );
  console.log(
    "id inventado  →",
    JSON.stringify(await get("99999999999999999", "id,username"))
  );
})().then(() => process.exit(0));
