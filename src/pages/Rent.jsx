import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Search, ShieldCheck, Sofa } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ListingCard from '@/components/listing/ListingCard';
import { availableClause } from '@/lib/listingsApi';

const QUICK_LINKS = [
  { label: 'Pets allowed', to: '/search?listing_type=rent&pets=allowed' },
  { label: 'Furnished', to: '/search?listing_type=rent&furnished=furnished' },
  { label: 'Under $2,000', to: '/search?listing_type=rent&price_max=2000' },
  { label: '2+ bedrooms', to: '/search?listing_type=rent&beds_min=2' },
  { label: 'Accepts applications', to: '/search?listing_type=rent&sort=newest' },
];

export default function Rent() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const fetchRentals = () =>
      base44.entities.Listing.filter(
        { listing_type: 'rent', ...availableClause() },
        { sort: '-published_date', limit: 9 },
      )
        .then((page) => {
          if (!active) return;
          setListings(page?.items || []);
          setError(null);
        })
        .catch((err) => {
          if (active) setError(err?.message || 'Rentals could not be loaded.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });

    fetchRentals();
    const unsubscribe = base44.entities.Listing.subscribe(() => {
      fetchRentals();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <div>
      <section className="border-b border-border bg-secondary/50">
        <div className="dm-container py-12 sm:py-16">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Rent a home on Dwellmark</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Search rentals by rent, bedrooms, availability, furnishings and pet policy, then contact the
            landlord directly. Applications are handled by the landlord, not by Dwellmark.
          </p>

          <form
            className="mt-7 flex max-w-xl items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const params = new URLSearchParams({ listing_type: 'rent' });
              if (query.trim()) params.set('q', query.trim());
              window.location.assign(`/search?${params.toString()}`);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="City, neighbourhood or postcode"
                aria-label="Search rentals"
                className="pl-9"
              />
            </div>
            <Button type="submit">Search rentals</Button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                className="dm-focus rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="dm-container py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Recently added rentals</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/search?listing_type=rent">Browse all rentals</Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!loading && !error && !listings.length ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
            No rentals are listed yet. Rentals appear here as soon as a landlord publishes one.
          </p>
        ) : null}

        {listings.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-secondary/50 py-12">
        <div className="dm-container grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: Sofa,
              title: 'Know what is included',
              body: 'Furnished status, parking and amenities are stated on each listing rather than left to guess.',
            },
            {
              icon: PawPrint,
              title: 'Filter by pet policy',
              body: 'Search only homes where your pets are welcome, using the policy the landlord recorded.',
            },
            {
              icon: ShieldCheck,
              title: 'Apply without surprises',
              body: 'Where a landlord accepts applications, you can attach documents securely. Dwellmark runs no credit or background checks.',
            },
          ].map((item) => (
            <div key={item.title} className="dm-card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}