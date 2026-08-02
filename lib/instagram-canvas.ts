// Desenho do post de Instagram (1080x1350 — o 4:5 do feed) num <canvas>.
//
// Corre no browser, de propósito: o browser já descodifica WebP/AVIF (que é o
// que os CDNs dos portais servem), as fontes do site já lá estão, e a
// pré-visualização no painel é exatamente o ficheiro que sai. A foto vem pelo
// proxy /api/admin/instagram/photo para o canvas não ficar "tainted".

export const IG_W = 1080;
export const IG_H = 1350;
const PHOTO_H = 820;
const PAD = 56;

const C = {
  cream: "#FBF6EA",
  ink: "#1F1D18",
  olive: "#414D11",
  clay: "#CE994B",
  bark: "#624E1C",
  stone2: "#F5DBB3",
  muted: "#6E6350",
  white: "#FFFFFF",
};

export interface IgCanvasData {
  headline: string; // "BMW Série 3"
  sub: string; // versão ou specs curtas
  specs: string[]; // pastilhas
  price: string | null; // já formatado ("18 900 €")
  badge: string; // selo no canto superior esquerdo
  location: string;
  photoUrl: string | null; // URL já pronto a carregar (proxy)
}

/** Fontes do site — o canvas só as usa depois de estarem carregadas. */
export async function ensureFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load("800 76px 'Barlow Condensed'"),
    document.fonts.load("700 42px 'Barlow Condensed'"),
    document.fonts.load("600 30px Barlow"),
    document.fonts.load("500 34px Barlow"),
  ]).catch(() => {});
  await document.fonts.ready;
}

const head = (size: number, weight = 800) =>
  `${weight} ${size}px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
const body = (size: number, weight = 500) =>
  `${weight} ${size}px Barlow, Arial, sans-serif`;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Parte o texto em linhas que cabem em `maxW`, no máximo `maxLines`. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxW || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  // se sobrou texto, corta a última linha com reticências
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    const usedAll =
      lines.join(" ").split(/\s+/).length === words.length && !!last;
    if (!usedAll) {
      while (last.length > 1 && ctx.measureText(last + "…").width > maxW) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + "…";
    }
  }
  return lines;
}

/** Pastilha de texto. Devolve a largura ocupada. */
function pill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: {
    font: string;
    bg: string;
    fg: string;
    border?: string;
    padX?: number;
    h?: number;
  }
) {
  const padX = opts.padX ?? 24;
  const h = opts.h ?? 56;
  ctx.font = opts.font;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.fillStyle = opts.bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = opts.fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  return w;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Desenha o post no canvas. Devolve true se a foto entrou. */
export async function drawInstagramPost(
  canvas: HTMLCanvasElement,
  d: IgCanvasData
): Promise<boolean> {
  canvas.width = IG_W;
  canvas.height = IG_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  await ensureFonts();

  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, IG_W, IG_H);

  // ---------- foto ----------
  const img = d.photoUrl ? await loadImage(d.photoUrl) : null;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, IG_W, PHOTO_H);
  ctx.clip();
  if (img) {
    // cover: preenche a área sem deformar
    const scale = Math.max(IG_W / img.width, PHOTO_H / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (IG_W - w) / 2, (PHOTO_H - h) / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, PHOTO_H);
    g.addColorStop(0, "#FCF4E2");
    g.addColorStop(1, C.stone2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, IG_W, PHOTO_H);
    // sem foto: só um símbolo — o título já aparece no painel de baixo
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "200px sans-serif";
    ctx.fillText("🚗", IG_W / 2, PHOTO_H / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();

  // selo de origem
  if (d.badge.trim()) {
    pill(ctx, d.badge, 40, 40, {
      font: head(30, 700),
      bg: C.ink,
      fg: C.cream,
      h: 58,
      padX: 26,
    });
  }

  // preço
  if (d.price) {
    ctx.font = head(62, 800);
    const w = ctx.measureText(d.price).width + 68;
    const h = 96;
    const x = IG_W - 40 - w;
    const y = PHOTO_H - 40 - h;
    ctx.fillStyle = C.clay;
    roundRect(ctx, x, y, w, h, 22);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.textBaseline = "middle";
    ctx.fillText(d.price, x + 34, y + h / 2 + 2);
  }

  // ---------- painel ----------
  let y = PHOTO_H + 52;
  const maxW = IG_W - PAD * 2;

  ctx.textBaseline = "top";
  ctx.font = head(76, 800);
  ctx.fillStyle = C.ink;
  for (const line of wrap(ctx, d.headline, maxW, 2)) {
    ctx.fillText(line, PAD, y);
    y += 80;
  }

  if (d.sub) {
    y += 4;
    ctx.font = body(34, 500);
    ctx.fillStyle = C.muted;
    ctx.fillText(wrap(ctx, d.sub, maxW, 1)[0] ?? "", PAD, y);
    y += 48;
  }

  // pastilhas de specs
  y += 18;
  let x = PAD;
  for (const s of d.specs) {
    ctx.font = body(30, 600);
    const w = ctx.measureText(s).width + 48;
    if (x + w > IG_W - PAD) {
      x = PAD;
      y += 70;
    }
    pill(ctx, s, x, y, {
      font: body(30, 600),
      bg: C.white,
      fg: C.bark,
      border: C.stone2,
      h: 58,
    });
    x += w + 14;
  }

  // ---------- rodapé ----------
  const footY = IG_H - 96;
  ctx.strokeStyle = C.stone2;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD, footY - 26);
  ctx.lineTo(IG_W - PAD, footY - 26);
  ctx.stroke();

  ctx.font = head(46, 800);
  ctx.fillStyle = C.olive;
  ctx.textBaseline = "middle";
  ctx.fillText("nacional2.pt", PAD, footY + 12);

  ctx.font = body(28, 500);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "right";
  ctx.fillText(d.location || "Portugal", IG_W - PAD, footY + 12);
  ctx.textAlign = "left";

  return !!img;
}

// ---------------------------------------------------------------------------
// Post do Índice Nacional 2 (mensal) — cartão de dados, sem foto.
// ---------------------------------------------------------------------------

export interface IgIndexData {
  monthLabel: string; // "agosto 2026"
  median: string; // "18 900 €"
  momPct: number | null; // +11.8 / -2.1
  activeCount: string; // "46 265"
  months: { label: string; median: number }[]; // série p/ gráfico de barras
  fuels: { seg: string; median: string }[]; // até 5 linhas
}

export async function drawIndexPost(
  canvas: HTMLCanvasElement,
  d: IgIndexData
): Promise<void> {
  canvas.width = IG_W;
  canvas.height = IG_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  await ensureFonts();

  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, IG_W, IG_H);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // selo + mês
  pill(ctx, "ÍNDICE NACIONAL 2", PAD, 52, {
    font: head(32, 700),
    bg: C.ink,
    fg: C.cream,
    h: 62,
    padX: 28,
  });
  ctx.font = body(32, 600);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(d.monthLabel, IG_W - PAD, 52 + 31);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // título
  let y = 170;
  ctx.font = head(70, 800);
  ctx.fillStyle = C.ink;
  ctx.fillText("Carros usados em Portugal", PAD, y);
  y += 96;

  // mediana gigante
  ctx.font = body(30, 600);
  ctx.fillStyle = C.muted;
  ctx.fillText("PREÇO MEDIANO DO MERCADO", PAD, y);
  y += 44;
  ctx.font = head(150, 800);
  ctx.fillStyle = C.clay;
  ctx.fillText(d.median, PAD, y);
  const medianW = ctx.measureText(d.median).width;

  // variação mensal ao lado
  if (d.momPct != null) {
    const up = d.momPct > 0;
    const txt = `${up ? "▲" : "▼"} ${up ? "+" : ""}${d.momPct.toLocaleString("pt-PT")}% vs mês anterior`;
    pill(ctx, txt, PAD + medianW + 32, y + 84, {
      font: body(30, 600),
      bg: up ? "#F3E0D4" : "#E4EAD6",
      fg: up ? "#8a3b12" : C.olive,
      h: 60,
      padX: 24,
    });
    ctx.textBaseline = "top";
  }
  y += 190;

  // gráfico de barras (mediana por mês)
  const chart = { x: PAD, w: IG_W - PAD * 2, h: 260 };
  const maxMedian = Math.max(...d.months.map((m) => m.median), 1);
  const n = d.months.length;
  const gap = 18;
  const barW = Math.min(120, (chart.w - gap * (n - 1)) / n);
  const totalW = barW * n + gap * (n - 1);
  let bx = chart.x + (chart.w - totalW) / 2;
  const baseline = y + chart.h;
  for (const m of d.months) {
    const h = Math.max(26, (m.median / maxMedian) * (chart.h - 60));
    ctx.fillStyle = C.clay;
    roundRect(ctx, bx, baseline - h, barW, h, 12);
    ctx.fill();
    // valor por cima
    ctx.font = body(26, 600);
    ctx.fillStyle = C.ink;
    ctx.textAlign = "center";
    ctx.fillText(
      `${Math.round(m.median / 100) / 10}k`,
      bx + barW / 2,
      baseline - h - 36
    );
    // mês por baixo
    ctx.fillStyle = C.muted;
    ctx.font = body(24, 600);
    ctx.fillText(m.label, bx + barW / 2, baseline + 12);
    ctx.textAlign = "left";
    bx += barW + gap;
  }
  y = baseline + 70;

  // medianas por combustível (duas colunas)
  const colW = (IG_W - PAD * 2 - 24) / 2;
  const rowH = 66;
  d.fuels.slice(0, 6).forEach((f, i) => {
    const cx = PAD + (i % 2) * (colW + 24);
    const cy = y + Math.floor(i / 2) * (rowH + 12);
    ctx.fillStyle = C.white;
    roundRect(ctx, cx, cy, colW, rowH, 16);
    ctx.fill();
    ctx.strokeStyle = C.stone2;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textBaseline = "middle";
    ctx.font = body(28, 600);
    ctx.fillStyle = C.bark;
    ctx.fillText(f.seg, cx + 22, cy + rowH / 2 + 1);
    ctx.font = head(38, 800);
    ctx.fillStyle = C.ink;
    ctx.textAlign = "right";
    ctx.fillText(f.median, cx + colW - 22, cy + rowH / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  });

  // rodapé
  const footY = IG_H - 96;
  ctx.strokeStyle = C.stone2;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD, footY - 26);
  ctx.lineTo(IG_W - PAD, footY - 26);
  ctx.stroke();

  ctx.font = head(46, 800);
  ctx.fillStyle = C.olive;
  ctx.textBaseline = "middle";
  ctx.fillText("nacional2.pt/indice-precos", PAD, footY + 12);

  ctx.font = body(26, 500);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "right";
  ctx.fillText(`${d.activeCount} anúncios · 4 portais`, IG_W - PAD, footY + 12);
  ctx.textAlign = "left";
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Falhou a exportar a imagem.")),
      "image/png"
    );
  });
}
