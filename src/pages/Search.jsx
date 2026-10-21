import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, BookmarkPlus, Filter, LayoutGrid, Map as MapIcon, Search as SearchIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import ListingCard from '@/components/listing/ListingCard';
import FilterPanel from '@/components/search/FilterPanel';
import ResultsMap from '@/components/search/ResultsMap';
import {
  activeFilterCount,
  cityOptions,
  describeFilters,
  filtersFromParams,
  paramsFromFilters,
  PAGE_SIZE,
  searchListings,
} from '@/lib/listingsApi';
import { SORT_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const EMPTY_FILTERS = filtersFromParams(new URLSearchParams());

export default function Search({ defaultListingType = '' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth() || {};
  const { toast } = useToast();

  const filters = useMemo(() => {
    const parsed = filtersFromParams(searchParams);
    if (defaultListingType && !parsed.listing_type) parsed.listing_type = defaultListingType;
    return parsed;
  }, [searchParams, defaultListingType]);

  const sort = searchParams.get('sort') || 'newest';
  const view = searchParams.get('view') === 'map' ? 'map' : 'list';
  const searchKey = searchParams.toString();

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [cities, setCities] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [queryDraft, setQueryDraft] = useState(filters.q);

  useEffect(() => {
    cityOptions()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setQueryDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    cityOptions()
      .then((known) => searchListings({ filters, sort, cities: known }))
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.next_cursor);
        setHasMore(page.has_more);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
        setError(err?.message || 'The search could not be completed. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = (patch) => {
    const next = { ...filters, ...patch };
    setSearchParams(paramsFromFilters(next, sort, view));
  };

  const resetFilters = () => {
    const next = { ...EMPTY_FILTERS };
    if (defaultListingType) next.listing_type = defaultListingType;
    setSearchParams(paramsFromFilters(next, 'newest', view));
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await searchListings({ filters, sort, cursor, cities });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch (err) {
      toast({ title: 'Could not load more homes', description: err?.message, variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  const saveSearch = async () => {
    if (!user?.id) {
      toast({ title: 'Sign in to save this search', description: 'Saved searches send you alerts.' });
      return;
    }
    const name = describeFilters(filters).slice(0, 70) || 'All homes';
    try {
      await base44.entities.SavedSearch.create({
        user_id: user.id,
        name,
        query_string: searchKey,
        filters,
        alerts_enabled: true,
        frequency: 'instant',
      });
      toast({ title: 'Search saved', description: `We will alert you when homes match “${name}”.` });
    } catch (err) {
      toast({ title: 'Could not save this search', description: err?.message, variant: 'destructive' });
    }
  };

  const filterCount = activeFilterCount(filters);
  const panel = <FilterPanel filters={filters} onChange={applyFilters} cities={cities} onReset={resetFilters} />;

  return (
    <div className="dm-container py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {filters.listing_type === 'rent' ? 'Homes for rent' : filters.listing_type === 'sale' ? 'Homes for sale' : 'Property search'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {loading ? 'Searching listings…' : `${items.length}${hasMore ? '+' : ''} matching listings`}
            {filterCount ? ` · ${filterCount} filter${filterCount === 1 ? '' : 's'} applied` : ''}
          </p>
        </div>

        <form
          className="flex w-full max-w-md items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters({ q: queryDraft });
          }}
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="City, address or keyword"
              aria-label="Search listings by city, address or keyword"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5">
            {panel}
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="lg:hidden">
                  <Filter className="mr-1.5 h-4 w-4" />
                  Filters{filterCount ? ` (${filterCount})` : ''}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter listings</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{panel}</div>
              </SheetContent>
            </Sheet>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSearchParams(paramsFromFilters(filters, event.target.value, view))}
                className="dm-focus h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={saveSearch}>
                <BookmarkPlus className="mr-1.5 h-4 w-4" />
                Save search
              </Button>
              <div className="flex rounded-lg border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setSearchParams(paramsFromFilters(filters, sort, 'list'))}
                  aria-pressed={view === 'list'}
                  className={cn(
                    'dm-focus flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                    view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setSearchParams(paramsFromFilters(filters, sort, 'map'))}
                  aria-pressed={view === 'map'}
                  className={cn(
                    'dm-focus flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                    view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Map
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
              <p className="mt-3 font-semibold">We could not complete that search</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button type="button" className="mt-4" onClick={() => setSearchParams(paramsFromFilters(filters, sort, view))}>
                Try again
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className={cn('mt-6 grid gap-5', view === 'map' ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3')}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-80 w-full rounded-2xl" />
              ))}
            </div>
          ) : null}

          {!loading && !error && !items.length ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
              <p className="font-display text-lg font-semibold">No homes match those filters</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Try widening the price range, removing a filter, or searching a nearby city.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button type="button" onClick={resetFilters}>
                  Clear all filters
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/search?listing_type=rent">Browse rentals instead</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {!loading && items.length ? (
            view === 'map' ? (
              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                  {items.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                <div className="h-[60vh] xl:sticky xl:top-24 xl:h-[70vh]">
                  <ResultsMap listings={items} activeId={activeId} onSelect={setActiveId} />
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )
          ) : null}

          {!loading && hasMore ? (
            <div className="mt-8 flex justify-center">
              <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load ${PAGE_SIZE} more homes`}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}