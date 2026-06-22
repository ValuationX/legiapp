/** Bill Aid logo — a minimal rounded tile + single check mark. Self-contained
 *  brand colors so it reads on light and dark surfaces alike. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="11" fill="#E6F1FB" />
      <path
        d="M13 25l7.5 7.5L35 16"
        fill="none"
        stroke="#185FA5"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full lockup: mark + "Bill Aid" wordmark. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-base font-semibold leading-none tracking-tight">
        Bill<span className="text-primary">Aid</span>
      </span>
    </span>
  );
}
