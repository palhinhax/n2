// Envio de email transacional via Resend (https://resend.com), por fetch —
// sem dependências. Sem RESEND_API_KEY definida, é um no-op silencioso
// (as notificações in-app funcionam na mesma).

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM || "Nacional 2 <alertas@nacional-2.pt>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) console.error("[email] resend error", res.status);
    return res.ok;
  } catch (err) {
    console.error("[email]", err);
    return false;
  }
}

const SITE = process.env.NEXTAUTH_URL || "https://nacional-2.pt";

/** Template simples e consistente com a marca. */
export function alertEmailHtml(opts: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaPath: string; // caminho interno, ex. /favoritos
}): string {
  const url = `${SITE}${opts.ctaPath}`;
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6F1E7;font-family:Georgia,serif;color:#2B2B26">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #E3D9C6">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:1px;color:#8B8574">NACIONAL 2</p>
    <h1 style="margin:0 0 12px;font-size:22px">${opts.title}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${opts.body}</p>
    <a href="${url}" style="display:inline-block;background:#CE994B;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-size:15px;font-weight:bold">${opts.ctaLabel}</a>
    <p style="margin:24px 0 0;font-size:12px;color:#8B8574">Recebes este email porque tens alertas ativos no Nacional 2.</p>
  </div>
</body></html>`;
}
