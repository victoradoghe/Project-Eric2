import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, History, RefreshCw, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ListingCard from '@/components/listing/ListingCard';
import SavedSearchList from '@/components/account/SavedSearchList';
import RecentlyViewedList from '@/components/account/RecentlyViewedList';
import SignInPrompt from '@/components/forms/SignInPrompt';
import { snapshotToListing } from '@/lib/listingFields';

export default function Favorites() {
  const { user } = useAuth() || {};
  const [favorites, setFavorites] = useState([]);
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [favoritePage, searchPage] = await Promise.all([
        base44.entities.Favorite.filter({ user_id: user.id }, { sort: '-created_date', limit: 60 }),
        base44.entities.SavedSearch.filter({ user_id: user.id }, { sort: '-created_date', limit: 50 }),
      ]);
      setFavorites((favoritePage?.items || []).map(snapshotToListing));
      setSearches(searchPage?.items || []);
    } catch (error) {
      setFavorites([]);
      setSearches([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const unsubscribe = base44.entities.Favorite.subscribe(() => load());
    return unsubscribe;
  }, [user?.id, load]);

  if (!user?.id) {
    return (
      <div className="dm-container py-14">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-2xl font-semibold">Saved homes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to keep a collection of homes and to save the searches behind them.
          </p>
          <div className="mt-6">
            <SignInPrompt
              title="Your saved homes live in your account"
              description="Saving is free and keeps your collection and alerts in sync across devices."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-container py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Your saved homes</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Collections, saved searches and recent history in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/search">
              <Search className="mr-1.5 h-4 w-4" />
              Find more homes
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="homes" className="mt-7">
        <TabsList>
          <TabsTrigger value="homes">
            <Heart className="mr-1.5 h-4 w-4" />
            Saved homes
          </TabsTrigger>
          <TabsTrigger value="searches">Saved searches</TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1.5 h-4 w-4" />
            Recently viewed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="homes" className="mt-6">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : favorites.length ? (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                Saved homes show the details as they were when you saved them — open a listing to see its
                current price and status.
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
              <Heart className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-3 font-semibold">No saved homes yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the heart on any listing to keep it here.
              </p>
              <Button className="mt-4" asChild>
                <Link to="/search">Browse listings</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="searches" className="mt-6">
          <SavedSearchList searches={searches} onChange={load} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <RecentlyViewedList />
        </TabsContent>
      </Tabs>
    </div>
  );
}