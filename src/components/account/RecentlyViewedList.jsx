import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ListingCard from '@/components/listing/ListingCard';
import { clearRecentlyViewed, getRecentlyViewed } from '@/lib/recentlyViewed';

export default function RecentlyViewedList() {
  const [entries, setEntries] = useState(() => getRecentlyViewed());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const recent = getRecentlyViewed();
      try {
        const page = await base44.entities.Listing.list();
        if (!active) return;
        const liveById = new Map((page?.items || []).map((item) => [item.id, item]));
        setEntries(
          recent.map((entry) => {
            const live = liveById.get(entry.id);
            return live ? { ...entry, ...live } : entry;
          }),
        );
      } catch {
        if (active) setEntries(recent);
      }
    };
    refresh();
    const unsubscribe = base44.entities.Listing.subscribe(refresh);
    window.addEventListener('storage', refresh);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
        <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">Nothing viewed yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Homes you open are kept here so you can find your way back to them.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/search">Browse homes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Your recent history is kept on this device only — it is not stored in your account, and these
          entries show the details as they were when you viewed them.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearRecentlyViewed();
            setEntries([]);
          }}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Clear history
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
