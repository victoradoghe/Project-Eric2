import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Circle,
  FileText,
  Heart,
  Inbox,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const CHECKLIST = [
  'Check what you can afford using the mortgage calculator',
  'Get a decision in principle from a lender',
  'Save the searches that match what you want',
  'Book viewings for the homes you like most',
  'Compare the homes you have seen side by side',
  'Make an offer and agree a price',
  'Commission a survey and a valuation',
  'Confirm your mortgage offer',
  'Exchange contracts, then complete',
];

const CHECKLIST_KEY = 'dwellmark_buying_checklist';

export default function Dashboard() {
  const { user } = useAuth() || {};
  const [counts, setCounts] = useState(null);
  const [listingStatus, setListingStatus] = useState([]);
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHECKLIST_KEY);
      setChecked(raw ? JSON.parse(raw) : []);
    } catch (error) {
      setChecked([]);
    }
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [listingsByStatus, savedHomes, savedSearches, unread, requestsSent] = await Promise.all([
      base44.entities.Listing.aggregate({ query: { owner_id: user.id }, groupBy: 'status' }).catch(() => ({ rows: [] })),
      base44.entities.Favorite.count({ user_id: user.id }).catch(() => 0),
      base44.entities.SavedSearch.count({ user_id: user.id }).catch(() => 0),
      base44.entities.Notification.count({ user_id: user.id, read: false }).catch(() => 0),
      base44.entities.ViewingRequest.count({ requester_id: user.id }).catch(() => 0),
    ]);

    setListingStatus(listingsByStatus?.rows || []);
    setCounts({ savedHomes, savedSearches, unread, requestsSent });
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCheck = (index) => {
    setChecked((current) => {
      const next = current.includes(index) ? current.filter((item) => item !== index) : [...current, index];
      try {
        window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch (error) {
        /* preference only */
      }
      return next;
    });
  };

  const totalListings = listingStatus.reduce((sum, row) => sum + (row.count || 0), 0);
  const publishedCount = listingStatus.find((row) => row.status === 'published')?.count || 0;
  const pendingCount = listingStatus.find((row) => row.status === 'pending_review')?.count || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {user?.full_name ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Your dashboard'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything you have saved, listed, asked about and been asked about.
        </p>
      </div>

      {!counts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Saved homes', value: counts.savedHomes, icon: Heart, to: '/favorites' },
              { label: 'Saved searches', value: counts.savedSearches, icon: Search, to: '/favorites' },
              { label: 'Requests you sent', value: counts.requestsSent, icon: CalendarCheck, to: '/dashboard/requests' },
              { label: 'Unread notifications', value: counts.unread, icon: Sparkles, to: '/notifications' },
            ].map((card) => (
              <Link key={card.label} to={card.to} className="dm-card dm-card-hover dm-focus p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <card.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-display text-2xl font-semibold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="dm-card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Your listings</h2>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/dashboard/listings">Manage</Link>
                </Button>
              </div>
              {totalListings ? (
                <>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {totalListings} listing{totalListings === 1 ? '' : 's'} · {publishedCount} published
                    {pendingCount ? ` · ${pendingCount} awaiting review` : ''}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {listingStatus.map((row) => (
                      <li key={row.status} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                        <span className="capitalize">{String(row.status || '').replace(/_/g, ' ')}</span>
                        <span className="font-semibold">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    You have not created a listing yet. Listing a property takes a few minutes and you can save
                    it as a draft.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link to="/dashboard/listings/new">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Create a listing
                    </Link>
                  </Button>
                </div>
              )}
            </section>

            <section className="dm-card p-6">
              <h2 className="font-display text-lg font-semibold">People waiting on you</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enquiries, viewing requests and rental applications sent to your listings stay private between
                you and the person who wrote them. Read, reply and confirm viewings in the inbox.
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" />
                  Enquiries and private reply threads
                </li>
                <li className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Viewing requests waiting for your confirmation
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Rental applications with attached documents
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link to="/dashboard/leads">Open the inbox</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/dashboard/applications">Applications</Link>
                </Button>
              </div>
            </section>
          </div>
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="dm-card p-6">
          <h2 className="font-display text-lg font-semibold">Your home-buying checklist</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A private checklist kept in this browser. Tick things off as you go.
          </p>
          <ul className="mt-4 space-y-2">
            {CHECKLIST.map((item, index) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => toggleCheck(index)}
                  className="dm-focus flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-secondary"
                >
                  {checked.includes(index) ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-border" />
                  )}
                  <span className={checked.includes(index) ? 'text-muted-foreground line-through' : ''}>{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="dm-card p-6">
          <h2 className="font-display text-lg font-semibold">Tools and shortcuts</h2>
          <div className="mt-4 grid gap-3">
            {[
              { to: '/mortgage', label: 'Mortgage calculator', body: 'Monthly payment, total interest and an amortisation schedule.', icon: Building2 },
              { to: '/mortgage', label: 'Affordability check', body: 'What a lender might consider affordable from your income and debts.', icon: BadgeCheck },
              { to: '/home-values', label: 'Home value estimate', body: 'Compare a property with comparable listings.', icon: Sparkles },
            ].map((item) => (
              <Link key={item.label} to={item.to} className="dm-focus flex items-start gap-3 rounded-xl border border-border p-4 transition hover:border-primary/40">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <item.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}