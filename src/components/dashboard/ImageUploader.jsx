import { useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Star, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';

const MAX_IMAGES = 8;
const MAX_BYTES = 8 * 1024 * 1024;

export default function ImageUploader({ images = [], onChange }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState(null);

  const uploadValidFiles = async (files) => {
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
      if (file_url) uploaded.push(file_url);
    }
    return uploaded;
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    if (files.length > MAX_IMAGES) {
      toast({ title: `Up to ${MAX_IMAGES} photos per listing`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadValidFiles(files);
      if (uploaded.length) {
        // Place newly uploaded photos first so the new photo immediately becomes the cover image
        const nextImages = [...uploaded, ...images].slice(0, MAX_IMAGES);
        await onChange?.(nextImages);
      }
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

  const handleReplaceFile = async (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setReplacingIndex(index);
    setUploading(true);
    try {
      const uploaded = await uploadValidFiles([file]);
      if (uploaded.length) {
        const nextImages = [...images];
        nextImages[index] = uploaded[0];
        await onChange?.(nextImages);
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'The photo could not be replaced. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setReplacingIndex(null);
      setUploading(false);
    }
  };

  const removeAt = (index) => {
    const nextImages = images.filter((_, idx) => idx !== index);
    onChange?.(nextImages);
  };

  const makeCover = (index) => {
    if (index <= 0 || index >= images.length) return;
    const chosen = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange?.([chosen, ...rest]);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((url, index) => (
          <div
            key={`${index}-${url?.slice(0, 48)}`}
            className="group relative overflow-hidden rounded-xl border border-border"
          >
            <div className="aspect-[4/3] w-full bg-secondary">
              <Image src={url} alt="" fittingType="fill" className="h-full w-full object-cover" />
            </div>

            {index === 0 ? (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                <Star className="h-2.5 w-2.5 fill-current" />
                Cover
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(index)}
                disabled={uploading}
                className="dm-focus absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm transition hover:bg-white"
              >
                <Star className="h-2.5 w-2.5" />
                Set cover
              </button>
            )}

            <div className="absolute right-2 top-2 flex items-center gap-1">
              <label
                aria-label="Replace photo"
                title="Replace photo"
                className="dm-focus grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-white/90 text-foreground shadow-sm transition hover:bg-white"
              >
                {replacingIndex === index ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleReplaceFile(index, event)}
                  disabled={uploading}
                />
              </label>

              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={uploading}
                aria-label="Remove photo"
                title="Remove photo"
                className="dm-focus grid h-7 w-7 place-items-center rounded-full bg-white/90 text-destructive shadow-sm transition hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_IMAGES ? (
          <label className="dm-focus flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary">
            {uploading && replacingIndex === null ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            {uploading && replacingIndex === null ? 'Uploading…' : 'Add photos'}
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
