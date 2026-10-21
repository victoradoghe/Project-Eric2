import { Check, Sparkles } from 'lucide-react';
import { formatArea, formatDate } from '@/lib/format';
import { petPolicyLabel, rentFrequencyLabel, statusLabel } from '@/lib/constants';

const FACT_ROWS = [
  { label: 'Property type', key: 'property_type', format: (value) => value?.replace(/_/g, ' ') || '—' },
  { label: 'Bedrooms', key: 'bedrooms' },
  { label: 'Bathrooms', key: 'bathrooms' },
  { label: 'Interior area', key: 'area_sqft', format: formatArea },
  { label: 'Lot size', key: 'lot_sqft', format: formatArea },
  { label: 'Year built', key: 'year_built' },
  { label: 'Parking', key: 'parking' },
  { label: 'Furnished', key: 'furnished', format: (value) => value?.replace(/_/g, ' ') || '—' },
  { label: 'Pet policy', key: 'pets_allowed', format: (value) => (value ? petPolicyLabel(value) : '—') },
  { label: 'Listing status', key: 'status', format: (value) => (value ? statusLabel(value) : '—') },
  { label: 'Rent frequency', key: 'rent_frequency', format: (value) => (value ? rentFrequencyLabel(value) : '—') },
  { label: 'Available from', key: 'available_from', format: (value) => (value ? formatDate(value) : '—') },
  { label: 'Listed', key: 'published_date', format: (value) => (value ? formatDate(value) : '—') },
];

export default function PropertyFacts({ listing }) {
  const rows = FACT_ROWS.filter((row) => listing?.[row.key] !== undefined).map((row) => ({
    label: row.label,
    value: row.format ? row.format(listing[row.key]) : listing[row.key] ?? '—',
  }));

  const amenities = listing?.amenities || [];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-xl font-semibold">Property details</h2>
        <dl className="mt-4 divide-y divide-border rounded-2xl border border-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium capitalize">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Details are supplied by the listing owner. Dwellmark shows them as provided and does not treat
          them as independently verified unless a verification badge appears on the listing.
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold">Features and amenities</h2>
        {amenities.length ? (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {amenities.map((amenity) => (
              <li key={amenity} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {amenity}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            The owner has not listed individual features for this property.
          </p>
        )}
      </div>
    </div>
  );
}