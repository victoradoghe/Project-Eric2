import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Eye, Save, Send, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ListingForm from '@/components/dashboard/ListingForm';
import { statusLabel } from '@/lib/constants';
import { listingSearchFields } from '@/lib/listingFields';

const NEW_DRAFT_KEY = 'dwellmark_new_listing_draft';

const emptyForm = (user) => ({
  title: '',
  property_type: 'house',
  address: '',
  address_visibility: 'full',
  neighborhood: '',
  city: '',
  state: '',
  postal_code: '',
  latitude: '',
  longitude: '',
  bedrooms: '',
  bathrooms: '',
  area_sqft: '',
  lot_sqft: '',
  year_built: '',
  parking: '',
  furnished: '',
  pets_allowed: '',
  amenities: [],
  description: '',
  listing_type: 'sale',
  price: '',
  currency: 'USD',
  rent_frequency: 'monthly',
  deposit: '',
  lease_months: '',
  available_from: '',
  open_house_at: '',
  accepts_applications: false,
  source: 'owner',
  owner_name: user?.full_name || '',
  owner_role: 'owner',
});

const num = (value) => (value === '' || value === null || value === undefined ? undefined : Number(value));

export default function ListingEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState(() => emptyForm(user));
  const [images, setImages] = useState([]);
  const [listing, setListing] = useState(null);
  const [propertyId, setPropertyId] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState([]);

  useEffect(() => {
    if (!id) {
      let restored = null;
      try {
        const raw = window.sessionStorage.getItem(NEW_DRAFT_KEY);
        if (raw) restored = JSON.parse(raw);
      } catch {
        restored = null;
      }
      if (restored?.form) {
        setForm({ ...emptyForm(user), ...restored.form });
        setImages(Array.isArray(restored.images) ? restored.images : []);
      } else {
        setForm(emptyForm(user));
        setImages([]);
      }
      setListing(null);
      setPropertyId(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    base44.entities.Listing.get(id)
      .then(async (record) => {
        if (!active || !record) return;
        setListing(record);
        setPropertyId(record.property_id);
        setImages(record.images || []);
        let property = null;
        try {
          property = record.property_id ? await base44.entities.Property.get(record.property_id) : null;
        } catch (error) {
          property = null;
        }
        if (!active) return;
        setForm({
          title: record.title || '',
          property_type: record.property_type || 'house',
          address: property?.address ?? record.address ?? '',
          address_visibility: record.address_visibility || 'full',
          neighborhood: property?.neighborhood ?? record.neighborhood ?? '',
          city: property?.city ?? record.city ?? '',
          state: property?.state ?? record.state ?? '',
          postal_code: property?.postal_code ?? record.postal_code ?? '',
          latitude: property?.latitude ?? record.latitude ?? '',
          longitude: property?.longitude ?? record.longitude ?? '',
          bedrooms: property?.bedrooms ?? record.bedrooms ?? '',
          bathrooms: property?.bathrooms ?? record.bathrooms ?? '',
          area_sqft: property?.area_sqft ?? record.area_sqft ?? '',
          lot_sqft: property?.lot_sqft ?? record.lot_sqft ?? '',
          year_built: property?.year_built ?? record.year_built ?? '',
          parking: property?.parking ?? record.parking ?? '',
          furnished: property?.furnished ?? record.furnished ?? '',
          pets_allowed: property?.pets_allowed ?? record.pets_allowed ?? '',
          amenities: record.amenities || property?.amenities || [],
          description: record.description || property?.description || '',
          listing_type: record.listing_type || 'sale',
          price: record.price ?? '',
          currency: record.currency || 'USD',
          rent_frequency: record.rent_frequency || 'monthly',
          deposit: record.deposit ?? '',
          lease_months: record.lease_months ?? '',
          available_from: record.available_from || '',
          open_house_at: record.open_house_at || '',
          accepts_applications: Boolean(record.accepts_applications),
          source: 'owner',
          owner_name: record.owner_name || user?.full_name || '',
          owner_role: record.owner_role || 'owner',
        });
      })
      .catch((error) => {
        toast({ title: 'Could not open this listing', description: error?.message, variant: 'destructive' });
        navigate('/dashboard/listings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (id || listing?.id) return;
    try {
      window.sessionStorage.setItem(NEW_DRAFT_KEY, JSON.stringify({ form, images }));
    } catch {
      // sessionStorage is best-effort
    }
  }, [id, listing?.id, form, images]);

  const handleImagesChange = async (nextImages) => {
    setImages(nextImages);
    const targetListingId = listing?.id || id;
    if (!targetListingId) return;
    try {
      if (propertyId) {
        await base44.entities.Property.update(propertyId, { images: nextImages }).catch(() => {});
      }
      const updated = await base44.entities.Listing.update(targetListingId, { images: nextImages });
      setListing((current) => (current ? { ...current, ...(updated || {}), images: nextImages } : current));
    } catch {
      // explicit save button can still persist
    }
  };

  const checkDuplicates = useCallback(
    async () => {
      if (!form.address || !form.city) return [];
      try {
        const page = await base44.entities.Listing.filter(
          { city: form.city, address: form.address },
          { limit: 5 },
        );
        const others = (page?.items || []).filter((item) => item.id !== listing?.id);
        setDuplicates(others);
        if (others.length) {
          toast({
            title: 'A similar listing already exists',
            description: 'The same address is already listed. Check the duplicates below before submitting.',
            variant: 'destructive',
          });
        }
        return others;
      } catch (error) {
        return [];
      }
    },
    [form.address, form.city, listing?.id, toast],
  );

  const persist = async (nextStatus) => {
    setSaving(true);
    try {
      const propertyPayload = {
        title: form.title,
        property_type: form.property_type,
        address: form.address,
        address_visibility: form.address_visibility,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        latitude: num(form.latitude),
        longitude: num(form.longitude),
        bedrooms: num(form.bedrooms),
        bathrooms: num(form.bathrooms),
        area_sqft: num(form.area_sqft),
        lot_sqft: num(form.lot_sqft),
        year_built: num(form.year_built),
        parking: form.parking,
        furnished: form.furnished || undefined,
        pets_allowed: form.pets_allowed || undefined,
        amenities: form.amenities,
        images,
        description: form.description,
        owner_id: user.id,
        owner_name: form.owner_name,
        owner_role: form.owner_role,
      };

      let resolvedPropertyId = propertyId;
      if (propertyId) {
        await base44.entities.Property.update(propertyId, propertyPayload);
      } else {
        const created = await base44.entities.Property.create(propertyPayload);
        resolvedPropertyId = created.id;
        setPropertyId(created.id);
      }

      const listingPayload = {
        property_id: resolvedPropertyId,
        title: form.title,
        description: form.description,
        listing_type: form.listing_type,
        price: num(form.price),
        currency: form.currency,
        rent_frequency: form.listing_type === 'rent' ? form.rent_frequency : undefined,
        deposit: num(form.deposit),
        lease_months: num(form.lease_months),
        available_from: form.available_from || undefined,
        open_house_at: form.open_house_at || undefined,
        accepts_applications: Boolean(form.accepts_applications),
        images,
        status: nextStatus,
        published_date:
          nextStatus === 'published' ? listing?.published_date || new Date().toISOString().slice(0, 10) : listing?.published_date,
        source: 'owner',
        owner_id: listing?.owner_id || user.id,
        owner_name: form.owner_name,
        owner_role: form.owner_role,
        property_type: form.property_type,
        bedrooms: num(form.bedrooms),
        bathrooms: num(form.bathrooms),
        area_sqft: num(form.area_sqft),
        lot_sqft: num(form.lot_sqft),
        year_built: num(form.year_built),
        parking: form.parking,
        furnished: form.furnished || undefined,
        pets_allowed: form.pets_allowed || undefined,
        amenities: form.amenities,
        address: form.address,
        address_visibility: form.address_visibility,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        latitude: num(form.latitude),
        longitude: num(form.longitude),
        under_offer: Boolean(listing?.under_offer),
        ...listingSearchFields(form),
      };

      let saved;
      if (listing?.id) {
        saved = await base44.entities.Listing.update(listing.id, listingPayload);
      } else {
        saved = await base44.entities.Listing.create(listingPayload);
      }
      setListing(saved);
      try {
        window.sessionStorage.removeItem(NEW_DRAFT_KEY);
      } catch {
        // ignore
      }

      if (nextStatus === 'pending_review') {
        toast({
          title: 'Submitted for review',
          description: 'An administrator will review this listing before it appears publicly.',
        });
      } else if (nextStatus === 'published') {
        toast({ title: 'Listing published' });
      } else {
        toast({ title: 'Draft saved' });
      }

      if (nextStatus !== 'draft') navigate('/dashboard/listings');
    } catch (error) {
      toast({ title: 'Could not save the listing', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!form.title || !form.city || !form.state || form.price === '') {
      toast({
        title: 'A few details are missing',
        description: 'Title, city, state and price are required before submitting.',
        variant: 'destructive',
      });
      return;
    }
    await checkDuplicates('pending_review');
    await persist('pending_review');
  };

  const removeListing = async () => {
    if (!listing?.id) return;
    setSaving(true);
    try {
      await base44.entities.Listing.delete(listing.id);
      if (propertyId) {
        try {
          await base44.entities.Property.delete(propertyId);
        } catch (error) {
          /* the listing is the record that matters */
        }
      }
      toast({ title: 'Listing deleted' });
      navigate('/dashboard/listings');
    } catch (error) {
      toast({ title: 'Could not delete the listing', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard/listings"
            className="dm-focus inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            All listings
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold">
            {listing ? 'Edit listing' : 'Create a listing'}
          </h1>
          {listing ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Status: <span className="font-medium capitalize">{statusLabel(listing.status)}</span>
              {listing.moderation_note ? ` · ${listing.moderation_note}` : ''}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Save as a draft at any point. Nothing is public until an administrator approves it.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => persist('draft')} disabled={saving || !form.title}>
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          {listing?.id && ['published', 'under_offer'].includes(listing.status) ? (
            <Button variant="outline" asChild>
              <Link to={`/property/${listing.id}`} target="_blank" rel="noreferrer">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          ) : null}
          {isAdmin ? (
            <Button onClick={() => persist('published')} disabled={saving || !form.title}>
              <Send className="mr-2 h-4 w-4" />
              Publish now
            </Button>
          ) : (
            <Button onClick={submitForReview} disabled={saving || !form.title}>
              <Send className="mr-2 h-4 w-4" />
              Submit for review
            </Button>
          )}
        </div>
      </div>

      {duplicates.length ? (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Possible duplicate listing
          </p>
          <p className="mt-2 text-xs leading-relaxed text-amber-900">
            This address is already listed. Publishing duplicates makes search worse for everyone — check
            these first.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-amber-900">
            {duplicates.map((item) => (
              <li key={item.id}>
                • {item.title} — {item.city} · {statusLabel(item.status)}
                {item.id === listing?.id ? '' : ' '}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ListingForm form={form} setForm={setForm} images={images} setImages={handleImagesChange} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Ownership verification is a separate step: an administrator can mark a listing as verified only
          after checking it, and until then no verified badge is shown.
        </p>
        {listing?.id ? (
          <Button variant="outline" onClick={removeListing} disabled={saving}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete this listing
          </Button>
        ) : null}
      </div>
    </div>
  );
}
