import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ListingCard from '@/components/listing/ListingCard';

export default function ListingRail({ title, subtitle, listings = [], viewAllHref, viewAllLabel = 'See all' }) {
  if (!listings.length) {
    return (
      <section className="dm-container py-12 sm:py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
          Nothing to show here yet. Listings appear as soon as an owner or landlord publishes one.
        </p>
      </section>
    );
  }

  return (
    <section className="dm-container py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {viewAllHref ? (
          <Link
            to={viewAllHref}
            className="dm-focus inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-primary hover:underline"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {listings.slice(0, 8).map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}