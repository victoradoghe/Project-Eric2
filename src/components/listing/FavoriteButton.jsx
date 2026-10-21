import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { favoriteSnapshot } from '@/lib/listingFields';
import { cn } from '@/lib/utils';

export default function FavoriteButton({ listing, className }) {
  const auth = useAuth() || {};
  const user = auth.user;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favoriteId, setFavoriteId] = useState(null);
  const [busy, setBusy] = useState(false);
  const listingId = listing?.id;

  useEffect(() => {
    let active = true;
    if (!user?.id || !listingId) {
      setFavoriteId(null);
      return () => {
        active = false;
      };
    }
    base44.entities.Favorite.filter({ user_id: user.id, listing_id: listingId }, { limit: 1 })
      .then((result) => {
        const items = Array.isArray(result) ? result : result?.items || [];
        if (active) setFavoriteId(items[0]?.id ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id, listingId]);

  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user?.id) {
      toast({ title: 'Sign in to save homes', description: 'Saved homes stay with your account.' });
      navigate('/login');
      return;
    }
    if (busy || !listingId) return;
    setBusy(true);
    try {
      if (favoriteId) {
        await base44.entities.Favorite.delete(favoriteId);
        setFavoriteId(null);
        toast({ title: 'Removed from saved homes' });
      } else {
        const created = await base44.entities.Favorite.create({
          user_id: user.id,
          listing_id: listingId,
          ...favoriteSnapshot(listing),
        });
        setFavoriteId(created?.id ?? null);
        toast({ title: 'Saved to your homes' });
      }
    } catch (error) {
      toast({
        title: 'Could not update saved homes',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={Boolean(favoriteId)}
      aria-label={favoriteId ? 'Remove from saved homes' : 'Save this home'}
      className={cn(
        'dm-focus grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-white/95 text-foreground/60 shadow-sm backdrop-blur transition hover:text-primary disabled:opacity-60',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', favoriteId && 'fill-primary text-primary')} />
    </button>
  );
}