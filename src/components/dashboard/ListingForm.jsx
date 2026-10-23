import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckboxField } from '@/components/forms/FieldControls';
import ImageUploader from '@/components/dashboard/ImageUploader';
import { AMENITIES, PET_POLICIES, PROPERTY_TYPES, RENT_FREQUENCIES } from '@/lib/constants';

function Field({ id, label, children, hint }) {
  return (
    <div>
      <Label htmlFor={id} className="dm-label">
        {label}
      </Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Select({ id, value, onChange, options, emptyLabel }) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
    >
      {emptyLabel ? <option value="">{emptyLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function ListingForm({ form, setForm, images, setImages }) {
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const number = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const isRent = form.listing_type === 'rent';

  return (
    <div className="space-y-6">
      <section className="dm-card p-6">
        <h2 className="font-display text-lg font-semibold">The property</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These details are stored once as the property record and reused if you ever list it again.
        </p>
        <div className="mt-5 space-y-4">
          <Field id="l-title" label="Listing title">
            <Input id="l-title" value={form.title} onChange={(event) => set('title')(event.target.value)} placeholder="Light-filled bungalow near the park" required />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="l-type" label="Property type">
              <Select id="l-type" value={form.property_type} onChange={set('property_type')} options={PROPERTY_TYPES} />
            </Field>
            <Field id="l-address" label="Street address">
              <Input id="l-address" value={form.address} onChange={(event) => set('address')(event.target.value)} />
            </Field>
            <Field id="l-neighborhood" label="Neighbourhood">
              <Input id="l-neighborhood" value={form.neighborhood} onChange={(event) => set('neighborhood')(event.target.value)} />
            </Field>
            <Field id="l-city" label="City">
              <Input id="l-city" value={form.city} onChange={(event) => set('city')(event.target.value)} required />
            </Field>
            <Field id="l-state" label="State or region">
              <Input id="l-state" value={form.state} onChange={(event) => set('state')(event.target.value)} required />
            </Field>
            <Field id="l-postal" label="Postal code">
              <Input id="l-postal" value={form.postal_code} onChange={(event) => set('postal_code')(event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="l-lat"
              label="Latitude"
              hint="Used to place the listing on the map. Leave blank rather than guessing — a listing without coordinates is simply not mapped."
            >
              <Input id="l-lat" type="number" step="0.000001" value={form.latitude} onChange={(event) => number('latitude')(event.target.value)} />
            </Field>
            <Field id="l-lng" label="Longitude">
              <Input id="l-lng" type="number" step="0.000001" value={form.longitude} onChange={(event) => number('longitude')(event.target.value)} />
            </Field>
          </div>

          <Field id="l-visibility" label="Address privacy">
            <Select
              id="l-visibility"
              value={form.address_visibility}
              onChange={set('address_visibility')}
              options={[
                { value: 'full', label: 'Show the full street address publicly' },
                { value: 'approximate', label: 'Show only the neighbourhood and city' },
              ]}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="l-beds" label="Bedrooms">
              <Input id="l-beds" type="number" step="1" value={form.bedrooms} onChange={(event) => number('bedrooms')(event.target.value)} />
            </Field>
            <Field id="l-baths" label="Bathrooms">
              <Input id="l-baths" type="number" step="0.5" value={form.bathrooms} onChange={(event) => number('bathrooms')(event.target.value)} />
            </Field>
            <Field id="l-area" label="Interior area (sq ft)">
              <Input id="l-area" type="number" value={form.area_sqft} onChange={(event) => number('area_sqft')(event.target.value)} />
            </Field>
            <Field id="l-lot" label="Lot size (sq ft)">
              <Input id="l-lot" type="number" value={form.lot_sqft} onChange={(event) => number('lot_sqft')(event.target.value)} />
            </Field>
            <Field id="l-year" label="Year built">
              <Input id="l-year" type="number" value={form.year_built} onChange={(event) => number('year_built')(event.target.value)} />
            </Field>
            <Field id="l-parking" label="Parking">
              <Input id="l-parking" value={form.parking} onChange={(event) => set('parking')(event.target.value)} placeholder="Garage, 2 spaces" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="l-furnished" label="Furnishing">
              <Select
                id="l-furnished"
                value={form.furnished}
                onChange={set('furnished')}
                emptyLabel="Not stated"
                options={[
                  { value: 'furnished', label: 'Furnished' },
                  { value: 'semi_furnished', label: 'Semi-furnished' },
                  { value: 'unfurnished', label: 'Unfurnished' },
                ]}
              />
            </Field>
            <Field id="l-pets" label="Pet policy">
              <Select id="l-pets" value={form.pets_allowed} onChange={set('pets_allowed')} emptyLabel="Not stated" options={PET_POLICIES} />
            </Field>
          </div>

          <div>
            <p className="dm-label">Features and amenities</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AMENITIES.map((amenity) => (
                <CheckboxField
                  key={amenity}
                  id={`amenity-${amenity}`}
                  label={amenity}
                  checked={form.amenities.includes(amenity)}
                  onChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      amenities: checked
                        ? [...current.amenities, amenity]
                        : current.amenities.filter((item) => item !== amenity),
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <Field id="l-description" label="Description">
            <Textarea
              id="l-description"
              rows={6}
              value={form.description}
              onChange={(event) => set('description')(event.target.value)}
              placeholder="Describe the home, the neighbourhood and anything a buyer or renter should know."
            />
          </Field>
        </div>
      </section>

      <section className="dm-card p-6">
        <h2 className="font-display text-lg font-semibold">The listing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Price, availability and who is marketing the property.
        </p>
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="l-listing-type" label="For sale or for rent">
              <Select
                id="l-listing-type"
                value={form.listing_type}
                onChange={set('listing_type')}
                options={[
                  { value: 'sale', label: 'For sale' },
                  { value: 'rent', label: 'For rent' },
                ]}
              />
            </Field>
            <Field id="l-price" label={isRent ? 'Rent' : 'Asking price'}>
              <Input id="l-price" type="number" value={form.price} onChange={(event) => number('price')(event.target.value)} required />
            </Field>
          </div>

          {isRent ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="l-frequency" label="Rent frequency">
                <Select id="l-frequency" value={form.rent_frequency} onChange={set('rent_frequency')} options={RENT_FREQUENCIES} />
              </Field>
              <Field id="l-deposit" label="Deposit">
                <Input id="l-deposit" type="number" value={form.deposit} onChange={(event) => number('deposit')(event.target.value)} />
              </Field>
              <Field id="l-lease" label="Lease length (months)">
                <Input id="l-lease" type="number" value={form.lease_months} onChange={(event) => number('lease_months')(event.target.value)} />
              </Field>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="l-available" label="Available from">
              <Input id="l-available" type="date" value={form.available_from} onChange={(event) => set('available_from')(event.target.value)} />
            </Field>
            <Field id="l-open-house" label="Open house (date and time)" hint="Optional. Listings with an upcoming open house can be filtered on it.">
              <Input id="l-open-house" type="datetime-local" value={form.open_house_at} onChange={(event) => set('open_house_at')(event.target.value)} />
            </Field>
          </div>

          {isRent ? (
            <CheckboxField
              id="l-applications"
              label="Accept rental applications through Dwellmark"
              checked={form.accepts_applications}
              onChange={set('accepts_applications')}
            />
          ) : null}

          <Field id="l-owner-name" label="Displayed contact name">
            <Input id="l-owner-name" value={form.owner_name} onChange={(event) => set('owner_name')(event.target.value)} />
          </Field>

          <Field id="l-owner-role" label="Contact is the">
            <Select
              id="l-owner-role"
              value={form.owner_role}
              onChange={set('owner_role')}
              options={[
                { value: 'owner', label: 'Owner' },
                { value: 'landlord', label: 'Landlord' },
              ]}
            />
          </Field>
        </div>
      </section>

      <section className="dm-card p-6">
        <h2 className="font-display text-lg font-semibold">Photos</h2>
        <div className="mt-5">
          <ImageUploader images={images} onChange={setImages} />
        </div>
      </section>
    </div>
  );
}