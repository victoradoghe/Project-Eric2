import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  BadgeCheck,
  Building2,
  Eye,
  Inbox,
  ExternalLink,
  Plus,
  Send,
  SquarePen,
  Tag,
  Trash2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LISTING_STATUSES, statusLabel } from '@/lib/constants';
import { formatDate, formatPrice } from '@/lib/format';

export default function DashboardListings() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [listings, setListings] = useState([]);
  const [inquiryCounts, setInquiryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const isAdmin = user?.role === 'admin';
  const ownerScope = isAdmin ? {} : { owner_id: user.id };

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const filter = statusFilter === 'all' ? ownerScope : { ...ownerScope, status: statusFilter };
      const page = await base44.entities.Listing.filter(filter, { sort: '-created_date', limit: 100 });
      setListings(page?.items || []);

      const inquiries = await base44.entities.Inquiry.aggregate({ query: { listing_owner_id: user.id }, groupBy: 'listing_id' });
      const counts = {};
      (inquiries?.rows || []).forEach((row) => {
        counts[row.listing_id] = row.count;
      });
      setInquiryCounts(counts);
    } catch (error) {
      toast({ title: 'Could not load your listings', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter, isAdmin, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (listing, patch, description) => {
    try {
      const payload = typeof patch === 'string' ? { status: patch } : { ...patch };
      if (status === 'published' && !listing.published_date) {
        payload.published_date = new Date().toISOString().slice(0, 10);
      }
      await base44.entities.Listing.update(listing.id, payload);
      toast({ title: description });
      load();
    } catch (error) {
      toast({ title: 'Could not update the listing', description: error?.message, variant: 'destructive' });
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const remove = async (listing) => {
    setDeletingBusy(true);
    try {
      await base44.entities.Listing.delete(listing.id);
      toast({ title: 'Listing deleted' });
      setConfirmDelete(null);
      load();
    } catch (error) {
      toast({ title: 'Could not delete the listing', description: error?.message, variant: 'destructive' });
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">My listings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Draft, submitted, published, sold or archived — every listing you manage.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/listings/new">
            <Plus className="mr-2 h-4 w-4" />
            New listing
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ value: 'all', label: 'All' }, ...LISTING_STATUSES].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            aria-pressed={statusFilter === option.value}
            className={`dm-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {!loading && !listings.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <Building2 className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 font-semibold">No listings in this view</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a listing and it will appear here as a draft until you submit it.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/dashboard/listings/new">Create a listing</Link>
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {listings.map((listing) => (
          <article key={listing.id} className="dm-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{listing.title}</h2>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {statusLabel(listing.status)}
                  </span>
                  {listing.featured ? (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                      Featured
                    </span>
                  ) : null}
                  {listing.verification_status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {[listing.address, listing.city, listing.state].filter(Boolean).join(', ')}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatPrice(listing)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {listing.views || 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Inbox className="h-3.5 w-3.5" />
                    {inquiryCounts[listing.id] || 0} enquiries
                  </span>
                  <span>{listing.published_date ? `Published ${formatDate(listing.published_date)}` : 'Not published'}</span>
                </div>
                {listing.moderation_note ? (
                  <p className="mt-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                    Moderation note: {listing.moderation_note}
                  </p>
                ) : null}
                {listing.status === 'rejected' ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Edit the listing to fix the reason above, then submit it again for review.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/dashboard/listings/${listing.id}/edit`}>
                    <SquarePen className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
                {['published', 'under_offer', 'sold'].includes(listing.status) ? (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/property/${listing.id}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>
                ) : null}
                {['draft', 'rejected'].includes(listing.status) ? (
                  <Button size="sm" onClick={() => setStatus(listing, 'pending_review', 'Submitted for review')}>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Submit
                  </Button>
                ) : null}
                {listing.status === 'published' && !listing.under_offer ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(listing, { under_offer: true }, 'Marked as under offer')}>
                    <Tag className="mr-1.5 h-3.5 w-3.5" />
                    Under offer
                  </Button>
                ) : null}
                {listing.under_offer ? (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(listing, { under_offer: false }, 'Back to available')}>
                    Available again
                  </Button>
                ) : null}
                {listing.status === 'published' ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(listing, { status: 'sold', under_offer: false }, 'Marked as sold')}>
                    Mark sold
                  </Button>
                ) : null}
                {listing.status !== 'archived' ? (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(listing, 'archived', 'Listing archived')}>
                    <Archive className="mr-1.5 h-3.5 w-3.5" />
                    Archive
                  </Button>
                ) : null}
                {['draft', 'archived', 'rejected'].includes(listing.status) || isAdmin ? (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(listing)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(next) => { if (!next) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `"${confirmDelete.title}" will be permanently removed. This cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                remove(confirmDelete);
              }}
              disabled={deletingBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}