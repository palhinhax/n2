// "Criado por NorthSail" — genuine authorship credit badge.
// One dofollow brand-anchor link. Never duplicate per page, never use
// keyword anchors, always the canonical https://www.north-sail.com.
// Server Component (CSS hover only) so it can live in the server-rendered footer.

const NORTHSAIL_FOOTER_HREF =
  "https://www.north-sail.com/?utm_source=nacional2&utm_medium=footer&utm_campaign=made-by-northsail";

type NorthSailCreditProps = {
  /** "dark" = for dark backgrounds (light text). "light" = for light backgrounds. */
  variant?: "dark" | "light";
  label?: string;
};

export default function NorthSailCredit({
  variant = "dark",
  label = "Criado por NorthSail",
}: NorthSailCreditProps) {
  // Brand palette: navy #0A2540. Colours chosen for contrast per background.
  const color =
    variant === "dark"
      ? "text-[#C9BFA6] hover:text-white"
      : "text-[#7A8699] hover:text-[#0A2540]";

  return (
    <a
      href={NORTHSAIL_FOOTER_HREF}
      target="_blank"
      rel="noopener"
      aria-label="Criado por NorthSail — north-sail.com"
      className={`inline-flex items-center gap-2 py-2 text-[12px] leading-none no-underline transition-colors ${color}`}
    >
      {/* Logo untouched — no recolor/distort. Empty alt: the label carries the text. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://www.north-sail.com/logo.png"
        alt=""
        width={18}
        height={18}
        className="block h-[18px] w-auto border-0"
      />
      <span>{label}</span>
    </a>
  );
}
