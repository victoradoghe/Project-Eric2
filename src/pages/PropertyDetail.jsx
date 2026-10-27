import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Calculator,
  Info,
  Pencil,
  Share2,
  ShieldQuestion,
  TrendingUp } from
'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import FavoriteButton from '@/components/listing/FavoriteButton';
import PhotoGallery from '@/components/property/PhotoGallery';
import PropertyFacts from '@/components/property/PropertyFacts';
import PropertyMiniMap from '@/components/property/PropertyMiniMap';
import InquiryForm from '@/components/property/InquiryForm';
import ReportListingDialog from '@/components/property/ReportListingDialog';
import RentalApplicationDialog from '@/components/property/RentalApplicationDialog';
import PayPalPaymentDialog from '@/components/property/PayPalPaymentDialog';
import SimilarProperties from '@/components/property/SimilarProperties';
import AdminPhotoEditor from '@/components/property/AdminPhotoEditor';
import AdminListingEditDialog from '@/components/admin/AdminListingEditDialog';
import InlinePriceEditor from '@/components/admin/InlinePriceEditor';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getListing, registerListingView, similarListings, displayAddress } from '@/lib/listingsApi';
import { formatDate, formatMoney, formatPrice, formatRelative, petPremium } from '@/lib/format';
import { MORTGAGE_DEFAULTS, petPolicyLabel, rentFrequencyLabel, statusLabel } from '@/lib/constants';
import { mortgageSummary, listingInterestRate, MINIMUM_MONTHLY_PAYMENT } from '@/lib/mortgage';
import { computeValuation, selectComparables } from '@/lib/valuation';
import { addRecentlyViewed } from '@/lib/recentlyViewed';
import { displayStatus } from '@/lib/listingFields';

const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function PropertyDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const auth = useAuth() || {};
  const isAdmin = auth.user?.role === 'admin';
  // The listing record mirrors every property field, so the page renders from one read.
  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    viewedRef.current = false;

    getListing(id).
    then(async (record) => {
      if (!active) return;
      setListing(record);
      addRecentlyViewed(record);
      try {
        const matches = await similarListings(record);
        if (active) setSimilar(matches);
      } catch (err) {
        if (active) setSimilar([]);
      }
    }).
    catch((err) => {
      if (!active) return;
      setError(
        err?.status === 403 || err?.status === 404 ?
        'This listing is not available publicly. It may still be a draft or was removed.' :
        err?.message || 'This listing could not be loaded.'
      );
    }).
    finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    const unsubscribe = base44.entities.Listing.subscribe(() => {
      getListing(id)
        .then(async (record) => {
          if (!active || !record) return;
          setListing(record);
          try {
            const matches = await similarListings(record);
            if (active) setSimilar(matches);
          } catch {
            // keep existing similar list
          }
        })
        .catch(() => {});
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [id]);

  useEffect(() => {
    if (!listing || viewedRef.current) return;
    viewedRef.current = true;
    registerListingView(listing.id, listing.views);
  }, [listing]);

  const mortgage = useMemo(() => {
    if (!listing || listing.listing_type !== 'sale') return null;
    const summary = mortgageSummary({
      price: listing.price,
      downPaymentMode: 'percent',
      downPaymentPercent: MORTGAGE_DEFAULTS.downPaymentPercent,
      interestRate: listingInterestRate(listing),
      termYears: MORTGAGE_DEFAULTS.termYears,
      annualTaxRate: MORTGAGE_DEFAULTS.annualTaxRate,
      annualInsurance: MORTGAGE_DEFAULTS.annualInsurance,
      monthlyHoa: MORTGAGE_DEFAULTS.monthlyHoa
    });
    // Enforce a minimum monthly payment on listing estimates.
    if (summary.totalMonthly < MINIMUM_MONTHLY_PAYMENT) {
      const bump = MINIMUM_MONTHLY_PAYMENT - summary.totalMonthly;
      return {
        ...summary,
        monthlyPrincipalInterest: summary.monthlyPrincipalInterest + bump,
        totalMonthly: MINIMUM_MONTHLY_PAYMENT
      };
    }
    return summary;
  }, [listing]);

  const valuation = useMemo(() => {
    if (!listing || listing.listing_type !== 'sale') return null;
    const subject = {
      city: listing.city,
      state: listing.state,
      property_type: listing.property_type,
      area_sqft: listing.area_sqft,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      year_built: listing.year_built
    };
    const comps = selectComparables(subject, similar, { excludeId: listing.id });
    return computeValuation(subject, comps);
  }, [listing, similar]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'You can paste it anywhere.' });
    } catch (err) {
      toast({ title: 'Copy this link', description: url });
    }
  };

  if (loading) {
    return (
      <div className="dm-container space-y-5 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>);

  }

  if (error || !listing) {
    return (
      <div className="dm-container py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-destructive" />
          <h1 className="mt-4 font-display text-xl font-semibold">Listing unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/search">Back to search</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Go to homepage</Link>
            </Button>
          </div>
        </div>
      </div>);

  }

  const isRent = listing.listing_type === 'rent';
  const rentLabel = listing.rent_frequency ? rentFrequencyLabel(listing.rent_frequency).toLowerCase() : 'per month';

  return (
    <div>
      <div className="dm-container pt-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="dm-focus inline-flex items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition hover:text-primary">
          
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                {listing.listing_type === 'rent' ? 'For rent' : 'For sale'}
              </span>
              {displayStatus(listing) !== 'published' ?
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                  {statusLabel(displayStatus(listing))}
                </span> :
              null}
              {listing.is_demo ?
              <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-white">
                  Sample listing
                </span> :
              null}
              {listing.verification_status === 'verified' ?
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Ownership verified
                </span> :
              null}
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">{listing.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{displayAddress(listing)}</p>
          </div>

          <div className="text-left sm:text-right">
            {isAdmin ?
            <InlinePriceEditor
              listing={listing}
              displayClassName="font-display text-3xl font-semibold"
              onSaved={(updated) => setListing((current) => ({ ...current, ...(updated || {}) }))} /> :
            <p className="font-display text-3xl font-semibold">{formatPrice(listing)}</p>}
            {isRent ? <p className="mt-1 text-xs text-muted-foreground">{rentLabel}</p> : null}
            {petPremium(listing) > 0 ?
            <p className="mt-1 text-xs text-muted-foreground">
                Includes {formatMoney(petPremium(listing), listing.currency || 'USD')} pet-allowed premium
              </p> :
            null}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:justify-end">
              <FavoriteButton listing={listing} />
              <Button type="button" variant="outline" size="sm" onClick={share}>
                <Share2 className="mr-1.5 h-4 w-4" />
                Share
              </Button>
              <ReportListingDialog listing={listing} />
            </div>
          </div>
        </div>
      </div>

      <div className="dm-container mt-6">
        <PhotoGallery listing={listing} />
        {isAdmin ?
        <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdminEditOpen(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit listing details
            </Button>
            <AdminPhotoEditor
            listing={listing}
            onSaved={(updated) => setListing((current) => ({ ...current, ...(updated || {}), images: updated?.images ?? current.images }))} />
          </div> :
        null}
        {isAdmin ? (
          <AdminListingEditDialog
            listing={listing}
            open={adminEditOpen}
            onOpenChange={setAdminEditOpen}
            onSaved={(updated) => {
              if (updated) {
                setListing((current) => ({ ...current, ...updated }));
              } else {
                getListing(id).then((rec) => rec && setListing(rec)).catch(() => {});
              }
            }}
          />
        ) : null}
      </div>

      <div className="dm-container mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold">About this home</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {listing.description || 'The owner has not written a description for this listing yet.'}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Listed {formatRelative(listing.published_date)}
              {listing.views ? ` · ${listing.views} views` : ''}
            </p>
          </section>

          <PropertyFacts listing={listing} />

          <section>
            
            <div className="mt-4">
              <PropertyMiniMap listing={listing} />
            </div>
          </section>

          {isRent ?
          <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Estimated recurring costs</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Rent</dt>
                  <dd className="mt-1 font-display text-lg font-semibold">
                    {money(listing.price)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">{rentLabel}</span>
                  </dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Deposit</dt>
                  <dd className="mt-1 font-display text-lg font-semibold">
                    {listing.deposit ? money(listing.deposit) : 'Not stated'}
                  </dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Lease length</dt>
                  <dd className="mt-1 font-display text-lg font-semibold">
                    {listing.lease_months ? `${listing.lease_months} months` : 'Not stated'}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Only figures the landlord has provided are shown. Dwellmark does not estimate utility,
                service or connection costs.
                {listing.pets_allowed ? ` Pet policy: ${petPolicyLabel(listing.pets_allowed).toLowerCase()}.` : ''}
              </p>
            </section> :
          null}

          {mortgage ?
          <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">Estimated monthly mortgage payment</h2>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Principal and interest
                  </dt>
                  <dd className="mt-1 font-display text-lg font-semibold">
                    {money(mortgage.monthlyPrincipalInterest)}
                  </dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Property taxes</dt>
                  <dd className="mt-1 font-display text-lg font-semibold">{money(mortgage.monthlyTax)}</dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Home insurance</dt>
                  <dd className="mt-1 font-display text-lg font-semibold">
                    {money(mortgage.monthlyInsurance)}
                  </dd>
                </div>
                <div className="rounded-xl bg-primary/10 p-4">
                  <dt className="text-xs uppercase tracking-wide text-primary">Total per month</dt>
                  <dd className="mt-1 font-display text-lg font-semibold text-primary">
                    {money(mortgage.totalMonthly)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Assumes a {MORTGAGE_DEFAULTS.downPaymentPercent}% down payment
                ({money(mortgage.downPayment)}), an interest rate of {listingInterestRate(listing)}% over{' '}
                {MORTGAGE_DEFAULTS.termYears} years, property tax at {MORTGAGE_DEFAULTS.annualTaxRate}% a year and
                insurance of {money(MORTGAGE_DEFAULTS.annualInsurance)} a year. This is an estimate, not a loan
                offer or financial advice.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to={`/mortgage?price=${listing.price}`}>Open the mortgage calculator</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/mortgage">Check affordability</Link>
                </Button>
              </div>
            </section> :
          null}

          {valuation ?
          <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">Indicative value estimate</h2>
              </div>
              {valuation.sufficient ?
            <>
                  <p className="mt-4 font-display text-3xl font-semibold">{money(valuation.estimated_value)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Range {money(valuation.low_estimate)} – {money(valuation.high_estimate)} ·{' '}
                    {valuation.comps_count} comparable listings · {valuation.confidence} confidence
                  </p>
                  <Accordion type="single" collapsible className="mt-4 rounded-xl border border-border px-4">
                    <AccordionItem value="how" className="border-b-0">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline">
                        How this estimate was calculated
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                          {valuation.assumptions.map((item) =>
                      <li key={item}>• {item}</li>
                      )}
                          <li>• Calculated on {formatDate(valuation.computed_date)}</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    {valuation.method_note} The asking price of{' '}
                    {money(listing.price)} shown above is the seller's price and is a separate figure.
                  </p>
                </> :

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {valuation.reason} No estimate is shown when there is not enough comparable listing data.
                </p>
            }
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to={`/home-values?city=${encodeURIComponent(listing.city || '')}&area=${listing.area_sqft || ''}&type=${listing.property_type || ''}`}>
                  Value a property yourself
                </Link>
              </Button>
            </section> :
          null}

          <section className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6">
            <h2 className="font-display text-lg font-semibold">Price history</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No price-change records are held for this listing, so no price history is shown. A completed
              sale price, an assessed value and the asking price above are separate figures and are never
              mixed together here.
            </p>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="dm-card p-6">
            
            
            





            
            {listing.verification_status === 'verified' ?
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" />
                Identity and ownership verified by Dwellmark
              </p> : null





            }

            <div className="mt-5 flex flex-col items-center text-center">
              <h3 className="font-display text-base font-semibold">Contact the {listing.owner_role === 'landlord' ? 'landlord' : 'owner'}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Send a message and they'll get back to you.</p>
              <div className="mt-4 w-full">
                <InquiryForm listing={listing} compact />
              </div>
            </div>
          </div>

          {isRent && listing.accepts_applications ?
          <div className="dm-card p-6">
              <h2 className="font-display text-lg font-semibold">Apply to rent</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This landlord accepts rental applications through Dwellmark. Applications are private and
                reviewed by the landlord.
              </p>
              <Button className="mt-4 w-full" onClick={() => setApplyOpen(true)}>
                Start an application
              </Button>
            </div> :
          null}

          <div className="dm-card p-6">
            <h2 className="font-display text-lg font-semibold">Pay with PayPal</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Prefer to pay with PayPal? You can complete your {isRent ? 'rental' : 'purchase'} using PayPal
              via Bitcoin. Review the step-by-step instructions before you send any payment.
            </p>
            <Button className="mt-4 w-full" onClick={() => setPayOpen(true)}>
              Pay with PayPal
            </Button>
          </div>

          <div className="rounded-2xl border border-border p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" />
              Before you enquire
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>• Never send money or deposits before viewing a property or confirming the owner.</li>
              <li>• Dwellmark does not process rent or deposits.</li>
              <li>• Report anything that looks wrong using the report link above.</li>
            </ul>
          </div>
        </aside>
      </div>

      <SimilarProperties listings={similar} />

      <PayPalPaymentDialog listing={listing} open={payOpen} onOpenChange={setPayOpen} />

      {isRent ?
      <RentalApplicationDialog
        listing={listing}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onCreated={() => toast({ title: 'Application recorded' })} /> :

      null}
    </div>);

}