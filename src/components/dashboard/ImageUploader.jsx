import { useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';

const MAX_IMAGES = 8;
const MAX_BYTES = 8 * 1024 * 1024;

export default function ImageUploader({ images = [], onChange }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    if (images.length + files.length > MAX_IMAGES) {
      toast({ title: `Up to ${MAX_IMAGES} photos per listing`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast({ title: `${file.name} is not an image`, variant: 'destructive' });
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast({ title: `${file.name} is larger than 8 MB`, variant: 'destructive' });
          continue;
        }
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        uploaded.push(file_url);
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'The photo could not be uploaded. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = (url) => onChange(images.filter((item) => item !== url));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((url) => (
          <div key={url} className="group relative overflow-hidden rounded-xl border border-border">
            <div className="aspect-[4/3] w-full bg-secondary">
              <Image src={url} alt="" fittingType="fill" className="h-full w-full" />
            </div>
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Remove photo"
              className="dm-focus absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-destructive opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES ? (
          <label className="dm-focus flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {uploading ? 'Uploading…' : 'Add photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={uploading}
            />
          </label>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Up to {MAX_IMAGES} photos, 8 MB each. Listing photos are stored publicly — anyone with the link can
        open them, which is what allows them to appear on public listing pages.
        {images.length ? ' The first photo is used as the cover image.' : ''}
      </p>
    </div>
  );
}