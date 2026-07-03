export default function Milestone({
  className = "w-8",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 68 100" className={className} aria-hidden="true">
      <path
        d="M8 34 Q8 8 34 8 Q60 8 60 34 L60 86 L8 86 Z"
        fill="#F5EBD6"
        stroke="#1F1D18"
        strokeWidth="3.5"
      />
      <path
        d="M8 34 Q8 8 34 8 Q60 8 60 34 L60 40 L8 40 Z"
        fill="#2A2721"
        stroke="#1F1D18"
        strokeWidth="3.5"
      />
      <text
        x="34"
        y="33"
        fontFamily="Barlow Condensed, sans-serif"
        fontSize="19"
        fontWeight="800"
        fill="#F5DBB3"
        textAnchor="middle"
      >
        N2
      </text>
      <text
        x="34"
        y="70"
        fontFamily="Barlow Condensed, sans-serif"
        fontSize="26"
        fontWeight="800"
        fill="#1F1D18"
        textAnchor="middle"
      >
        136
      </text>
      <rect
        x="2"
        y="86"
        width="64"
        height="12"
        rx="3"
        fill="#2A2721"
        stroke="#1F1D18"
        strokeWidth="3"
      />
    </svg>
  );
}
