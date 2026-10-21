import { useEffect, useState } from 'react';
import { BadgeCheck, BedDouble, Bath, Maximize, MapPin, CalendarClock } from 'lucide-react';
import { Image } from '@/components/ui/image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatArea, formatDate, fullAddress } from '@/lib/format';
import { propertyTypeLabel, statusLabel } from '@/lib/constants';

export default function PhotoGallery({ listing }) {
  const images = (listing?.images || []).filter(Boolean);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [listing?.id]);

  if (!images.length) {
    return (
      <div className="grid aspect-[16/10] w-full place-items-center rounded-2xl border border-dashed border-border bg-secondary/50">
        <p className="text-sm text-muted-foreground">No photos have been added to this listing yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="dm-focus block w-full overflow-hidden rounded-2xl">
            <div className="aspect-[16/10] w-full bg-secondary">
              <Image
                src={images[active]}
                alt={`${listing.title} — photo ${active + 1}`}
                fittingType="fill"
                className="h-full w-full"
              />
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl border-none bg-white p-2 sm:p-4">
          <DialogTitle className="sr-only">{listing.title} photos</DialogTitle>
          <Image src={images[active]} alt={`${listing.title} — photo ${active + 1}`} fittingType="fit" className="max-h-[80vh] w-full" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setActive(index)}
                className={`dm-focus h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                  index === active ? 'border-primary' : 'border-transparent'
                }`}
              >
                <Image src={image} alt="" fittingType="fill" className="h-full w-full" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              className={`dm-focus h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                index === active ? 'border-primary' : 'border-transparent hover:border-border'
              }`}
            >
              <Image src={image} alt="" fittingType="fill" className="h-full w-full" />
            </button>
          ))}
        </div>
      ) : null}

      <dl className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <BedDouble className="h-4 w-4" />
          <span>{listing.bedrooms ?? '—'} bedrooms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Bath className="h-4 w-4" />
          <span>{listing.bathrooms ?? '—'} bathrooms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Maximize className="h-4 w-4" />
          <span>{listing.area_sqft ? formatArea(listing.area_sqft) : 'Area not recorded'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          <span>{fullAddress(listing)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BadgeCheck className="h-4 w-4" />
          <span>{propertyTypeLabel(listing.property_type)}</span>
        </div>
        {listing.open_house_at ? (
          <div className="flex items-center gap-1.5 text-primary">
            <CalendarClock className="h-4 w-4" />
            <span>Open house {formatDate(listing.open_house_at)}</span>
          </div>
        ) : null}
        {listing.status && listing.status !== 'published' ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            {statusLabel(listing.status)}
          </span>
        ) : null}
      </dl>
    </div>
  );
}