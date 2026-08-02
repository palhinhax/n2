// Gráficos do Índice Nacional 2 — SVG desenhado à mão, nas cores da marca.
// Server components (sem JS no cliente): os tooltips usam :hover via CSS.
//
// Paleta categórica validada (validate_palette.js, superfície #FBF6EA):
//   clay #CE994B · teal #1FA37A · rust #C6603B · blue #3A6FC4 · green #6B8E23
// O aviso de CVD clay↔teal é coberto por etiquetas diretas + gaps de 2px.

export const CHART = {
  clay: "#CE994B",
  teal: "#1FA37A",
  rust: "#C6603B",
  blue: "#3A6FC4",
  green: "#6B8E23",
  ink: "#1F1D18",
  muted: "#6E6350",
  grid: "#E8DFC9",
  surface: "#FBF6EA",
};

// cor fixa por combustível — segue a entidade, nunca a posição
export const FUEL_COLOR: Record<string, string> = {
  Gasolina: CHART.clay,
  Diesel: CHART.rust,
  Elétrico: CHART.teal,
  Híbrido: CHART.green,
  "Híbrido Plug-In": CHART.blue,
};

const kEur = (n: number) =>
  n >= 1000
    ? `${(Math.round(n / 100) / 10).toLocaleString("pt-PT")} k€`
    : `${n} €`;

const fmtInt = (n: number) => n.toLocaleString("pt-PT");

/* ------------------------------------------------------------------ */
/* Linha/área — evolução mensal e curva de desvalorização              */
/* ------------------------------------------------------------------ */

export function TrendChart({
  id,
  points,
  color = CHART.clay,
  width = 760,
  height = 240,
  area = true,
  unit = "median",
}: {
  id: string; // ids únicos para os gradientes
  points: { label: string; value: number; sub?: string }[];
  color?: string;
  /** largura do viewBox — usa ~a largura real do contentor para o texto
   *  não encolher (760 a toda a largura, ~480 em meia coluna) */
  width?: number;
  height?: number;
  area?: boolean;
  unit?: "median" | "count";
}) {
  if (points.length === 0) return null;
  const W = width;
  const H = height;
  // margens laterais generosas: as etiquetas dos pontos extremos são
  // centradas no ponto e saíam do viewBox (ficavam cortadas)
  const P = { l: 48, r: 48, t: 34, b: 30 };
  // posição de texto presa dentro do viewBox
  const clampX = (v: number) => Math.min(Math.max(v, 44), W - 44);
  const vs = points.map((p) => p.value);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const span = Math.max(hi - lo, 1);
  const y = (v: number) =>
    P.t + (H - P.t - P.b) * (1 - (v - lo + span * 0.08) / (span * 1.16));
  const x = (i: number) =>
    points.length === 1
      ? W / 2
      : P.l + ((W - P.l - P.r) * i) / (points.length - 1);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`)
    .join(" ");
  const areaPath = `${line} L${x(points.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`;

  // etiquetas visíveis: todas até 8 pontos; depois só extremos + fim
  const labelled = new Set<number>();
  if (points.length <= 8) points.forEach((_, i) => labelled.add(i));
  else {
    labelled.add(0);
    labelled.add(points.length - 1);
    labelled.add(vs.indexOf(hi));
    labelled.add(vs.indexOf(lo));
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Gráfico de evolução"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* grelha discreta */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={P.l}
          x2={W - P.r}
          y1={P.t + (H - P.t - P.b) * f}
          y2={P.t + (H - P.t - P.b) * f}
          stroke={CHART.grid}
          strokeWidth="1"
        />
      ))}
      {area && <path d={areaPath} fill={`url(#${id}-fill)`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={p.label} className="group">
          {/* alvo de hover maior que a marca */}
          <rect
            x={x(i) - Math.min(34, W / points.length / 2)}
            y={P.t - 10}
            width={Math.min(68, W / points.length)}
            height={H - P.t - P.b + 20}
            fill="transparent"
          />
          <circle
            cx={x(i)}
            cy={y(p.value)}
            r="5.5"
            fill={color}
            stroke={CHART.surface}
            strokeWidth="2.5"
            className="group-hover:r-7 transition-all"
          />
          {labelled.has(i) && (
            <text
              x={clampX(x(i))}
              y={y(p.value) - 14}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill={CHART.ink}
            >
              {unit === "median" ? kEur(p.value) : fmtInt(p.value)}
            </text>
          )}
          <text
            x={clampX(x(i))}
            y={H - 8}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill={CHART.muted}
          >
            {p.label}
          </text>
          {/* tooltip no hover */}
          <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
            <rect
              x={Math.min(Math.max(x(i) - 74, 4), W - 152)}
              y={Math.max(y(p.value) - 62, 2)}
              width="148"
              height="40"
              rx="9"
              fill={CHART.ink}
            />
            <text
              x={Math.min(Math.max(x(i), 78), W - 78)}
              y={Math.max(y(p.value) - 62, 2) + 17}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="700"
              fill="#FBF6EA"
            >
              {p.label}:{" "}
              {unit === "median" ? kEur(p.value) : `${fmtInt(p.value)}`}
            </text>
            <text
              x={Math.min(Math.max(x(i), 78), W - 78)}
              y={Math.max(y(p.value) - 62, 2) + 32}
              textAnchor="middle"
              fontSize="11"
              fill="#D9CBAE"
            >
              {p.sub ?? ""}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Donut — mix de combustível                                          */
/* ------------------------------------------------------------------ */

export function FuelDonut({
  slices,
  centerTop,
  centerBottom,
}: {
  slices: { label: string; value: number; detail: string }[];
  centerTop: string;
  centerBottom: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 74;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        viewBox="0 0 200 200"
        className="w-[190px] shrink-0"
        role="img"
        aria-label="Distribuição por combustível"
      >
        {slices.map((s) => {
          const frac = s.value / total;
          const len = Math.max(frac * C - 3, 1); // gap de ~3px entre fatias
          const off = -acc * C;
          acc += frac;
          return (
            <g key={s.label} className="group">
              <circle
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={FUEL_COLOR[s.label] ?? CHART.muted}
                strokeWidth="30"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={off}
                transform="rotate(-90 100 100)"
                className="transition-all group-hover:stroke-[36]"
              >
                <title>{`${s.label}: ${s.detail} (${Math.round(frac * 100)}%)`}</title>
              </circle>
            </g>
          );
        })}
        <text
          x="100"
          y="94"
          textAnchor="middle"
          fontSize="24"
          fontWeight="800"
          fill={CHART.ink}
        >
          {centerTop}
        </text>
        <text
          x="100"
          y="114"
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill={CHART.muted}
        >
          {centerBottom}
        </text>
      </svg>
      <ul className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        {slices.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-2 text-[0.88rem] text-ink"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: FUEL_COLOR[s.label] ?? CHART.muted }}
            />
            <span className="font-semibold">{s.label}</span>
            <span className="text-n2muted">
              {Math.round((s.value / total) * 100)}%
            </span>
            <span className="ml-auto font-bold">{s.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barras horizontais — marcas, tempo de venda                         */
/* ------------------------------------------------------------------ */

export function HBars({
  rows,
  showValue = true,
}: {
  rows: {
    label: string;
    value: number; // comprimento da barra
    display: string; // valor mostrado no fim da barra
    sub?: string; // texto pequeno à direita da etiqueta
    color?: string;
  }[];
  showValue?: boolean;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="group">
          <div className="mb-0.5 flex items-baseline justify-between text-[0.84rem]">
            <span className="font-semibold text-ink">{r.label}</span>
            {r.sub && (
              <span className="text-[0.76rem] text-n2muted2">{r.sub}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-[14px] flex-1 overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_#EFE6D2]">
              <div
                className="h-full rounded-full transition-all group-hover:brightness-110"
                style={{
                  width: `${Math.max((r.value / max) * 100, 3)}%`,
                  background: `linear-gradient(90deg, ${r.color ?? CHART.clay}CC, ${r.color ?? CHART.clay})`,
                }}
              />
            </div>
            {showValue && (
              <span className="w-[72px] shrink-0 text-right text-[0.86rem] font-bold text-ink">
                {r.display}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Colunas — histograma por faixa de preço                             */
/* ------------------------------------------------------------------ */

export function ColumnChart({
  bands,
  color = CHART.teal,
}: {
  bands: { label: string; n: number }[];
  color?: string;
}) {
  const max = Math.max(...bands.map((b) => b.n), 1);
  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {bands.map((b) => (
        <div
          key={b.label}
          className="group flex flex-1 flex-col items-center gap-1"
          title={`${b.label}: ${fmtInt(b.n)} anúncios`}
        >
          <span className="text-[0.72rem] font-bold text-ink opacity-80 group-hover:opacity-100 sm:text-[0.8rem]">
            {b.n >= 1000 ? `${Math.round(b.n / 100) / 10}k` : b.n}
          </span>
          <div
            className="w-full rounded-t-xl transition-all group-hover:brightness-110"
            style={{
              height: `${Math.max((b.n / max) * 150, 6)}px`,
              background: `linear-gradient(180deg, ${color}, ${color}99)`,
            }}
          />
          <span className="text-center text-[0.64rem] font-semibold leading-tight text-n2muted sm:text-[0.72rem]">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
