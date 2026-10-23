import { useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import ImageUploader from '@/components/dashboard/ImageUploader';

/**
 * Lets the website administrator update the photos on any listing from the public
 * property page. Only the admin role sees this control — buyers, sellers and landlords
 * never do.
 */
export default function AdminPhotoEditor({ listing, onSaved }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setImages(listing?.images || []);
  }, [open, listing?.id]);

  const dirty = JSON.stringify(images) !== JSON.stringify(listing?.images || []);

  const save = async () => {
    if (!listing?.id || !dirty) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await base44.entities.Listing.update(listing.id, { images });
      toast({ title: 'Photos updated', description: 'The listing gallery now shows the new photos.' });
      onSaved?.(updated);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Could not save photos',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <ImageIcon className="mr-1.5 h-4 w-4" />
          Edit photos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update listing photos</DialogTitle>
          <DialogDescription>
            Owner-only tool. Add, remove or replace the photos shown on this listing. New photos are
            stored publicly — anyone with the link can open them, which is what lets them appear on the
            public listing page. The first photo is the cover image.
          </DialogDescription>
        </DialogHeader>

        <ImageUploader images={images} onChange={setImages} />

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save photos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}