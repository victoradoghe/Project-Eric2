import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { BRAND } from '@/lib/constants';
import { cn } from '@/lib/utils';

const LOGO_URL =
  'https://media.base44.com/images/public/6acffb88a86afc6700988b18/a800c78f4_DwellmarkHomesLogo.png';

// Compact roof + window mark that mirrors the logo icon: a charcoal roof outline
// on the warm off-white plate, with the muted-gold 2x2 window beneath the peak.
export function BrandMark({ className }) {
  return (
    <span
      className={cn(
        'relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-primary',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M3.5 10.4 12 4l8.5 6.4V20H3.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="absolute left-1/2 top-[56%] grid -translate-x-1/2 grid-cols-2 gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-[1px] bg-gold" />
        ))}
      </span>
    </span>
  );
}

export default function BrandLogo({ className, showTagline = false }) {
  if (showTagline) {
    // Full official logo (icon + wordmark + tagline) — used where there is room.
    return (
      <Link
        to="/"
        aria-label="Dwellmark — home"
        className={cn('dm-focus inline-flex items-center rounded-xl', className)}
      >
        <span className="grid place-items-center rounded-xl bg-background p-1.5">
          <Image
            src={LOGO_URL}
            alt="Dwellmark — Homes · People · Futures"
            fittingType="fit"
            className="block h-24 w-24"
          />
        </span>
      </Link>
    );
  }

  // Horizontal lockup for compact bars (site header, dashboard header).
  return (
    <Link to="/" className={cn('dm-focus flex items-center gap-2.5 rounded-xl', className)}>
      <BrandMark />
      <span className="font-display text-xl font-semibold tracking-tight text-foreground">
        {BRAND.name}
      </span>
    </Link>
  );
}