// Ilustração usada quando o carro não tem fotos
export default function CarArt({
  color = "#CE994B",
  className = "w-full",
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 210 118" className={className} aria-hidden="true">
      <ellipse cx="105" cy="102" rx="86" ry="7" fill="#1F1D18" opacity=".13" />
      <g transform="translate(3 8) scale(.97)">
        <path
          d="M18 74 Q14 74 14 66 Q14 52 26 48 L44 42 Q60 22 96 22 Q136 22 152 42 L182 48 Q196 52 196 64 Q196 74 188 74 Z"
          fill={color}
          stroke="#1F1D18"
          strokeWidth="3.6"
          strokeLinejoin="round"
        />
        <path
          d="M56 44 Q68 30 94 29 L94 44 Z"
          fill="#FCF4E2"
          stroke="#1F1D18"
          strokeWidth="3"
        />
        <path
          d="M104 29 Q132 30 143 44 L104 44 Z"
          fill="#FCF4E2"
          stroke="#1F1D18"
          strokeWidth="3"
        />
        <circle
          cx="56"
          cy="74"
          r="15"
          fill="#2A2721"
          stroke="#1F1D18"
          strokeWidth="3.4"
        />
        <circle
          cx="56"
          cy="74"
          r="6.5"
          fill="#9A9078"
          stroke="#1F1D18"
          strokeWidth="2.2"
        />
        <circle
          cx="152"
          cy="74"
          r="15"
          fill="#2A2721"
          stroke="#1F1D18"
          strokeWidth="3.4"
        />
        <circle
          cx="152"
          cy="74"
          r="6.5"
          fill="#9A9078"
          stroke="#1F1D18"
          strokeWidth="2.2"
        />
        <rect
          x="186"
          y="52"
          width="9"
          height="7"
          rx="3"
          fill="#F5DBB3"
          stroke="#1F1D18"
          strokeWidth="2"
        />
        <rect
          x="14"
          y="54"
          width="8"
          height="6"
          rx="3"
          fill="#CE994B"
          stroke="#1F1D18"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
