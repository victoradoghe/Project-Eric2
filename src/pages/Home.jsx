import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ZipCodeLocator from '@/components/home/ZipCodeLocator';
import ListingRail from '@/components/home/ListingRail';
import PopularPlaces from '@/components/home/PopularPlaces';
import PropertyCategories from '@/components/home/PropertyCategories';
import HowItWorks from '@/components/home/HowItWorks';
import OwnerCTA from '@/components/home/OwnerCTA';
import ToolsIntro from '@/components/home/ToolsIntro';
import Testimonials from '@/components/home/Testimonials';
import WhatsAppChat from '@/components/WhatsAppChat';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { availableClause } from '@/lib/listingsApi';

export default function Home() {
  const [listings, setListings] = useState({ featured: [], recent: [], rentals: [] });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      base44.entities.Listing.filter(
        { ...availableClause(), featured: true },
        { sort: '-published_date', limit: 8 },
      ),
      base44.entities.Listing.filter({ ...availableClause() }, { sort: '-published_date', limit: 8 }),
      base44.entities.Listing.filter(
        { ...availableClause(), listing_type: 'rent' },
        { sort: '-published_date', limit: 8 },
      ),
    ])
      .then(([featured, recent, rentals]) => {
        if (!active) return;
        setListings({
          featured: featured?.items || [],
          recent: recent?.items || [],
          rentals: rentals?.items || [],
        });
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasAnyListing =
    listings.featured.length || listings.recent.length || listings.rentals.length;
  const featuredRail = listings.featured.length ? listings.featured : listings.recent;

  return (
    <div>
      <ZipCodeLocator onRelocated={() => window.location.reload()} />

      {loading ? (
        <section className="dm-container py-14">
          <Skeleton className="h-8 w-52" />
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-2xl" />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && failed ? (
        <section className="dm-container py-14">
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
            <p className="font-display text-lg font-semibold">Listings are temporarily unavailable</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              The marketplace could not be reached just now. Everything else on the page still works — try again
              in a moment.
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </section>
      ) : null}

      {!loading && !failed && !hasAnyListing ? (
        <section className="dm-container py-14">
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
            <p className="font-display text-lg font-semibold">No homes are listed yet</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              As soon as an owner, landlord or agent publishes a listing it appears here, in search and on its
              own page. If you are setting the marketplace up, an administrator can load clearly labelled sample
              listings from the administration area.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/dashboard/listings/new">List a property</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/sell">How selling works</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && !failed && hasAnyListing ? (
        <>
          <ListingRail
            title="Featured homes"
            subtitle="A selection of listings promoted by owners and agents across the marketplace."
            listings={featuredRail}
            viewAllHref="/search?listing_type=sale"
            viewAllLabel="Browse all homes"
          />

          <ListingRail
            title="Recently added"
            subtitle="The newest listings to reach Dwellmark, straight from the database."
            listings={listings.recent}
            viewAllHref="/search"
          />

          <PopularPlaces listings={listings.recent} />

          <PropertyCategories />

          <ListingRail
            title="Homes for rent"
            subtitle="Rentals with rent, availability and pet policy recorded on the listing."
            listings={listings.rentals}
            viewAllHref="/rent"
          />
        </>
      ) : null}

      {!loading && !failed ? (
        <>
          <HowItWorks />
          <OwnerCTA />
          <ToolsIntro />
          <Testimonials />
        </>
      ) : null}

      <section className="dm-container py-12">
        <WhatsAppChat />
      </section>
    </div>
  );
}