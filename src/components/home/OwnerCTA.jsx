import { Link } from 'react-router-dom';
import { CheckCircle2, Upload } from 'lucide-react';

const POINTS = [
  'Publish a listing yourself, or invite the agent who handles your sale',
  'Add photos, price, features and availability, then submit for review',
  'Every enquiry, viewing request and rental application lands in one inbox',
];

export default function OwnerCTA() {
  return (
    <section className="dm-container py-12 sm:py-16">
      <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-12 text-white sm:px-12 sm:py-14">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <span className="dm-chip border-white/25 bg-white/10 text-white/85">For owners and agents</span>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              List your property on Dwellmark
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
              Create a listing in minutes, keep it in draft until it is ready, and manage everyone who
              asks about it from a single dashboard.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/dashboard/listings/new"
                className="dm-focus inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/90"
              >
                <Upload className="h-4 w-4" />
                Create a listing
              </Link>
              <Link
                to="/sell"
                className="dm-focus inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                How selling works
              </Link>
            </div>
          </div>
          <ul className="space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 rounded-2xl border border-white/15 bg-white/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                <span className="text-sm leading-relaxed text-white/85">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}