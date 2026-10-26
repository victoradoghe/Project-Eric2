import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ListingForm from '@/components/dashboard/ListingForm';
import { adminEditListing } from '@/lib/adminActions';
import { useAuth } from '@/lib/AuthContext';

const emptyForm = (listing) => ({
  title: listing?.title || '',
  property_type: listing?.property_type || 'house',
  address: listing?.address || '',
  address_visibility: listing?.address_visibility || 'full',
  neighborhood: listing?.neighborhood || '',
  city: listing?.city || '',
  state: listing?.state || '',
  postal_code: listing?.postal_code || '',
  latitude: listing?.latitude ?? '',
  longitude: listing?.longitude ?? '',
  bedrooms: listing?.bedrooms ?? '',
  bathrooms: listing?.bathrooms ?? '',
  area_sqft: listing?.area_sqft ?? '',
  lot_sqft: listing?.lot_sqft ?? '',
  year_built: listing?.year_built ?? '',
  parking: listing?.parking || '',
  furnished: listing?.furnished || '',
  pets_allowed: listing?.pets_allowed || '',
  amenities: listing?.amenities || [],
  description: listing?.description || '',
  listing_type: listing?.listing_type || 'sale',
  price: listing?.price ?? '',
  currency: listing?.currency || 'USD',
  rent_frequency: listing?.rent_frequency || 'monthly',
  deposit: listing?.deposit ?? '',
  lease_months: listing?.lease_months ?? '',
  available_from: listing?.available_from || '',
  open_house_at: listing?.open_house_at || '',
  accepts_applications: Boolean(listing?.accepts_applications),
  source: 'owner',
  owner_name: listing?.owner_name || '',
  owner_role: listing?.owner_role || 'owner',
});

export default function AdminListingEditDialog({ listing, open, onOpenChange, onSaved }) {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm(listing));
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const listingId = listing?.id;

  useEffect(() => {
    if (!open || !listingId) return;
    setLoading(true);
    let active = true;
    base44.entities.Listing
      .get(listingId)
      .then(async (record) => {
        if (!active || !record) return;
        let property = null;
        try {
          property = record.property_id ? await base44.entities.Property.get(record.property_id) : null;
        } catch (error) {
          property = null;
        }
        if (!active) return;
        setForm({
          ...emptyForm(record),
          address: record.address ?? property?.address ?? '',
          neighborhood: record.neighborhood ?? property?.neighborhood ?? '',
          latitude: record.latitude ?? property?.latitude ?? '',
          longitude: record.longitude ?? property?.longitude ?? '',
          bedrooms: record.bedrooms ?? property?.bedrooms ?? '',
          bathrooms: record.bathrooms ?? property?.bathrooms ?? '',
          area_sqft: record.area_sqft ?? property?.area_sqft ?? '',
          lot_sqft: record.lot_sqft ?? property?.lot_sqft ?? '',
          year_built: record.year_built ?? property?.year_built ?? '',
          parking: record.parking ?? property?.parking ?? '',
          furnished: record.furnished ?? property?.furnished ?? '',
          pets_allowed: record.pets_allowed ?? property?.pets_allowed ?? '',
          amenities: record.amenities || property?.amenities || [],
          description: record.description || property?.description || '',
        });
        setImages(record.images || property?.images || []);
      })
      .catch((error) => {
        toast({ title: 'Could not open this listing', description: error?.message, variant: 'destructive' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImagesChange = async (nextImages) => {
    setImages(nextImages);
    if (!listingId) return;
    try {
      await base44.entities.Listing.update(listingId, { images: nextImages });
      if (listing?.property_id) {
        await base44.entities.Property.update(listing.property_id, { images: nextImages }).catch(() => {});
      }
    } catch {
      // full save button can still persist
    }
  };

  const save = async () => {
    if (!form.title || !form.city || !form.state || form.price === '') {
      toast({
        title: 'A few details are missing',
        description: 'Title, city, state and price are required.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await adminEditListing(user, listing, { form, images });
      toast({ title: 'Listing updated' });
      onSaved?.();
      onOpenChange?.(false);
    } catch (error) {
      toast({ title: 'Could not save the listing', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
          <DialogDescription>
            Administrators can edit any listing detail directly. The owner is notified and the change is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <>
            <ListingForm form={form} setForm={setForm} images={images} setImages={handleImagesChange} />
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
