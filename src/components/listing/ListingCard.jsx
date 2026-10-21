import { Link } from 'react-router-dom';
import { Bath, BedDouble, MapPin, Ruler } from 'lucide-react';
import { Image } from '@/components/ui/image';
import FavoriteButton from '@/components/listing/FavoriteButton';
import { formatPrice, formatArea, formatListingDate } from '@/lib/format';
import { propertyTypeLabel, statusLabel } from '@/lib/constants';
import { displayStatus } from '@/lib/listingFields';
import { cn } from '@/lib/utils';

export default function ListingCard({ listing, className }) {
  if (!listing) return null;
  const cover = listing.images?.[0];
  const isRent = listing.listing_type === 'rent';

  return (
    <article className={cn('dm-card dm-card-hover group overflow-hidden', className)}>
      <div className="relative">
        <Link to={`/property/${listing.id}`} className="dm-focus block">
          <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
            <Image
              src={cover}
              alt={`${listing.title || 'Property'} in ${listing.city || 'the area'}`}
              fittingType="fill"
              className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
            />
          </div>
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {listing.is_demo ? (
            <span className="rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              Sample
            </span>
          ) : null}
          {displayStatus(listing) !== 'published' ? (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {statusLabel(displayStatus(listing))}
            </span>
          ) : null}
          {listing.featured ? (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
              Featured
            </span>
          ) : null}
        </div>
        <FavoriteButton listing={listing} className="absolute right-3 top-3" />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-xl font-semibold text-foreground">{formatPrice(listing)}</p>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {propertyTypeLabel(listing.property_type)}
          </span>
        </div>
        <Link to={`/property/${listing.id}`} className="dm-focus block rounded-lg">
          <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">
            {listing.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">
              {[listing.address, listing.city, listing.state].filter(Boolean).join(', ')}
            </span>
          </p>
        </Link>
        <div className="flex items-center gap-4 border-t border-border pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-4 w-4" /> {listing.bedrooms ?? '—'} bd
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="h-4 w-4" /> {listing.bathrooms ?? '—'} ba
          </span>
          <span className="flex items-center gap-1.5">
            <Ruler className="h-4 w-4" /> {listing.area_sqft ? formatArea(listing.area_sqft) : '—'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatListingDate(listing)}
          {isRent && listing.rent_frequency ? ` · Rent ${listing.rent_frequency}` : ''}
        </p>
      </div>
    </article>
  );
}