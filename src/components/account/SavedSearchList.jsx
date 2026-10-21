import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Search, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { searchListings, filtersFromParams } from '@/lib/listingsApi';
import { formatRelative } from '@/lib/format';

export default function SavedSearchList({ searches, onChange }) {
  const { toast } = useToast();
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all(
      (searches || []).slice(0, 8).map(async (search) => {
        const filters = search.filters && Object.keys(search.filters).length
          ? search.filters
          : filtersFromParams(new URLSearchParams(search.query_string || ''));
        try {
          const page = await searchListings({ filters, sort: 'newest', limit: 1 });
          return [search.id, page.items.length];
        } catch (error) {
          return [search.id, null];
        }
      }),
    ).then((pairs) => {
      if (active) setPreviews(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
  }, [searches]);

  const toggleAlerts = async (search, enabled) => {
    try {
      await base44.entities.SavedSearch.update(search.id, { alerts_enabled: enabled });
      onChange?.();
    } catch (error) {
      toast({ title: 'Could not update alerts', description: error?.message, variant: 'destructive' });
    }
  };

  const remove = async (search) => {
    try {
      await base44.entities.SavedSearch.delete(search.id);
      toast({ title: 'Saved search removed' });
      onChange?.();
    } catch (error) {
      toast({ title: 'Could not remove the search', description: error?.message, variant: 'destructive' });
    }
  };

  if (!searches?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
        <Search className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">No saved searches yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run a search and choose “Save search” to be alerted when matching homes are published.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/search">Start a search</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searches.map((search) => (
        <div key={search.id} className="dm-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="truncate font-semibold">{search.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Saved {formatRelative(search.created_date)}
              {previews[search.id] !== undefined && previews[search.id] !== null
                ? ` · ${previews[search.id]} new match${previews[search.id] === 1 ? '' : 'es'} right now`
                : ''}
              {search.last_notified ? ` · last alert ${formatRelative(search.last_notified)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BellRing className="h-3.5 w-3.5" />
              Alerts
              <Switch
                checked={Boolean(search.alerts_enabled)}
                onCheckedChange={(value) => toggleAlerts(search, value)}
              />
            </label>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/search?${search.query_string || ''}`}>View results</Link>
            </Button>
            <button
              type="button"
              onClick={() => remove(search)}
              aria-label={`Delete ${search.name}`}
              className="dm-focus rounded-lg p-2 text-muted-foreground transition hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}