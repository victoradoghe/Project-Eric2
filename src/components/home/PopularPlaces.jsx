import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { popularPlaces } from '@/lib/sampleListings';

export default function PopularPlaces({ listings = [] }) {
  const places = popularPlaces(listings);
  if (!places.length) return null;

  return (
    <section className="dm-container py-12 sm:py-16">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">Popular places</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Markets with the most homes currently listed on {`Dwellmark`}.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {places.map((place) => (
          <Link
            key={`${place.city}-${place.state}`}
            to={`/search?q=${encodeURIComponent(`${place.city}, ${place.state}`)}`}
            className="dm-card dm-card-hover dm-focus flex flex-col gap-1 p-5"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
              <MapPin className="h-3.5 w-3.5" />
              {place.state}
            </span>
            <span className="font-display text-lg font-semibold">{place.city}</span>
            <span className="text-sm text-muted-foreground">
              {place.count} {place.count === 1 ? 'listing' : 'listings'} available
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}