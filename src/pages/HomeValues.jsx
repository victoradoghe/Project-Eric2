import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calculator, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import ValuationResult from '@/components/tools/ValuationResult';
import { PROPERTY_TYPES } from '@/lib/constants';
import { computeValuation, selectComparables } from '@/lib/valuation';
import { publicClause } from '@/lib/listingsApi';
import { formatDate } from '@/lib/format';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function HomeValues() {
  const [params] = useSearchParams();
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState({
    address: '',
    city: params.get('city') || '',
    state: '',
    postal_code: '',
    property_type: params.get('type') || 'house',
    bedrooms: '',
    bathrooms: '',
    area_sqft: params.get('area') || '',
    year_built: '',
  });
  const [result, setResult] = useState(null);
  const [compsSource, setCompsSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.ValuationEstimate.filter({ user_id: user.id }, { sort: '-created_date', limit: 5 })
      .then((page) => setHistory(page?.items || []))
      .catch(() => setHistory([]));
  }, [user?.id]);

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.city.trim()) {
      toast({ title: 'Enter a city', description: 'Comparable listings are found by city.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const page = await base44.entities.Listing.filter(
        {
          city: { $regex: `^${escapeRegex(form.city.trim())}$`, $options: 'i' },
          listing_type: 'sale',
          ...publicClause(),
        },
        { limit: 60, sort: '-published_date' },
      );
      const listings = page?.items || [];
      setCompsSource(listings);

      const subject = {
        city: form.city.trim(),
        state: form.state.trim(),
        property_type: form.property_type,
        area_sqft: Number(form.area_sqft) || null,
        bedrooms: Number(form.bedrooms) || null,
        bathrooms: Number(form.bathrooms) || null,
        year_built: Number(form.year_built) || null,
      };

      const comps = selectComparables(subject, listings);
      const valuation = computeValuation(subject, comps);
      setResult(valuation);

      if (valuation.sufficient && user?.id) {
        try {
          const saved = await base44.entities.ValuationEstimate.create({
            user_id: user.id,
            address: form.address,
            city: form.city.trim(),
            state: form.state.trim(),
            postal_code: form.postal_code,
            property_type: form.property_type,
            bedrooms: subject.bedrooms,
            bathrooms: subject.bathrooms,
            area_sqft: subject.area_sqft,
            year_built: subject.year_built,
            estimated_value: valuation.estimated_value,
            low_estimate: valuation.low_estimate,
            high_estimate: valuation.high_estimate,
            price_per_sqft: valuation.price_per_sqft,
            comps_count: valuation.comps_count,
            confidence: valuation.confidence,
            method_note: valuation.method_note,
            assumptions: valuation.assumptions,
            computed_date: valuation.computed_date,
            currency: 'USD',
          });
          setHistory((current) => [saved, ...current].slice(0, 5));
        } catch (err) {
          /* saving history is optional */
        }
      }
    } catch (err) {
      setError(err?.message || 'The estimate could not be calculated.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dm-container py-10">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">Home value estimates</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Enter a property's details and Dwellmark compares it against real listings held in the same market.
          The calculation is shown in full, and no figure is produced when there is not enough data.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <span className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          This is an indicative estimate from comparable listings, not a professional appraisal, and it is not
          connected to any external valuation or property-data provider. An asking price, an assessed value and
          a completed sale price are different figures and are kept separate.
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
        <form onSubmit={submit} className="dm-card space-y-4 p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-lg font-semibold">Property details</h2>
          <div>
            <Label htmlFor="v-address" className="dm-label">
              Street address (optional)
            </Label>
            <Input id="v-address" value={form.address} onChange={(event) => update('address')(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="v-city" className="dm-label">
                City
              </Label>
              <Input id="v-city" value={form.city} onChange={(event) => update('city')(event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="v-state" className="dm-label">
                State or region
              </Label>
              <Input id="v-state" value={form.state} onChange={(event) => update('state')(event.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="v-postal" className="dm-label">
              Postal code (optional)
            </Label>
            <Input id="v-postal" value={form.postal_code} onChange={(event) => update('postal_code')(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="v-type" className="dm-label">
              Property type
            </Label>
            <select
              id="v-type"
              value={form.property_type}
              onChange={(event) => update('property_type')(event.target.value)}
              className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="v-beds" className="dm-label">
                Beds
              </Label>
              <Input id="v-beds" type="number" value={form.bedrooms} onChange={(event) => update('bedrooms')(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="v-baths" className="dm-label">
                Baths
              </Label>
              <Input id="v-baths" type="number" value={form.bathrooms} onChange={(event) => update('bathrooms')(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="v-year" className="dm-label">
                Built
              </Label>
              <Input id="v-year" type="number" value={form.year_built} onChange={(event) => update('year_built')(event.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="v-area" className="dm-label">
              Interior area (sq ft)
            </Label>
            <Input id="v-area" type="number" value={form.area_sqft} onChange={(event) => update('area_sqft')(event.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Calculator className="mr-2 h-4 w-4" />
            {loading ? 'Comparing listings…' : 'Calculate estimate'}
          </Button>
          {!user?.id ? (
            <p className="text-xs text-muted-foreground">
              You can use this tool without an account. Sign in to keep a history of your estimates.
            </p>
          ) : null}
        </form>

        <div className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</p>
          ) : null}

          {!loading && !error && !result ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
              <p className="font-semibold">Enter a city to get started</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Dwellmark finds for-sale listings in the same city and property type, then compares price per
                square foot. The comparables used are always listed below the estimate.
              </p>
            </div>
          ) : null}

          {result ? <ValuationResult result={result} /> : null}

          {result && compsSource.length ? (
            <p className="text-xs text-muted-foreground">
              {compsSource.length} for-sale listing{compsSource.length === 1 ? '' : 's'} were found in {form.city}.
            </p>
          ) : null}

          {history.length ? (
            <div className="dm-card p-6">
              <h3 className="font-display text-lg font-semibold">Your recent estimates</h3>
              <ul className="mt-4 divide-y divide-border">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {[entry.address, entry.city, entry.state].filter(Boolean).join(', ') || entry.city}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.comps_count} comparables · {formatDate(entry.computed_date)}
                      </span>
                    </span>
                    <span className="font-display text-lg font-semibold">
                      ${Number(entry.estimated_value).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Saved estimates are private to your account. See all of your listings and enquiries in your{' '}
                <Link to="/dashboard" className="font-medium text-primary hover:underline">
                  dashboard
                </Link>
                .
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}