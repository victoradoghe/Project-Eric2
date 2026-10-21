import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Clock, Eye, Pencil, Star, Trash2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  adminDeleteListing,
  approveListing,
  archiveListing,
  rejectListing,
  toggleFeatured,
  verifyListingOwnership,
} from '@/lib/adminActions';
import AdminListingEditDialog from '@/components/admin/AdminListingEditDialog';
import InlinePriceEditor from '@/components/admin/InlinePriceEditor';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/constants';

const TABS = [
  { value: 'pending_review', label: 'Awaiting review' },
  { value: 'published', label: 'Published' },
  { value: 'under_offer', label: 'Under offer' },
  { value: 'sold', label: 'Sold' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'draft', label: 'Drafts' },
];

export default function ModerationQueue() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [status, setStatus] = useState('pending_review');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState({});
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await base44.entities.Listing.filter({ status }, { sort: '-created_date', limit: 100 });
      setListings(page?.items || []);
    } catch (error) {
      toast({ title: 'Could not load the queue', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, listing) => {
    try {
      await action();
      toast({ title: 'Done' });
      load();
    } catch (error) {
      toast({ title: 'That action failed', description: error?.message, variant: 'destructive' });
    }
  };

  const reject = async (listing) => {
    const reason = (reasons[listing.id] || '').trim();
    if (!reason) {
      toast({
        title: 'Add a reason',
        description: 'The account that submitted the listing sees this reason.',
        variant: 'destructive',
      });
      return;
    }
    await run(() => rejectListing(user, listing, reason), listing);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await adminDeleteListing(user, deleting, (reasons[deleting.id] || '').trim());
      toast({ title: 'Listing deleted' });
      setDeleting(null);
      load();
    } catch (error) {
      toast({ title: 'Could not delete the listing', description: error?.message, variant: 'destructive' });
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            aria-pressed={status === tab.value}
            className={`dm-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              status === tab.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {!loading && !listings.length ? (
        <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Nothing in this queue right now.
        </p>
      ) : null}

      <div className="space-y-3">
        {listings.map((listing) => (
          <article key={listing.id} className="dm-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{listing.title}</h3>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {statusLabel(listing.status)}
                  </span>
                  {listing.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                      <Star className="h-3 w-3" />
                      Featured
                    </span>
                  ) : null}
                  {listing.is_demo ? (
                    <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                      Sample data
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {[listing.address, listing.city, listing.state].filter(Boolean).join(', ')}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <InlinePriceEditor listing={listing} onSaved={load} />
                  <span className="text-muted-foreground">
                    · listed by {listing.owner_name || 'unknown'} ({listing.owner_role || 'owner'})
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {formatDate(listing.created_date)}
                  {listing.published_date ? ` · published ${formatDate(listing.published_date)}` : ''}
                  {listing.moderation_note ? ` · note: ${listing.moderation_note}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/property/${listing.id}`} target="_blank" rel="noreferrer">
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Open
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(listing)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                {status !== 'published' ? (
                  <Button size="sm" onClick={() => run(() => approveListing(user, listing), listing)}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Approve
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(() => toggleFeatured(user, listing, !listing.featured), listing)}
                >
                  <Star className="mr-1.5 h-3.5 w-3.5" />
                  {listing.featured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(() => verifyListingOwnership(user, listing, listing.verification_status !== 'verified'), listing)}
                >
                  <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                  {listing.verification_status === 'verified' ? 'Remove verification' : 'Mark ownership verified'}
                </Button>
                {status !== 'archived' ? (
                  <Button size="sm" variant="ghost" onClick={() => run(() => archiveListing(user, listing, 'Archived by an administrator'), listing)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Archive
                  </Button>
                ) : null}
                <Button size="sm" variant="destructive" onClick={() => setDeleting(listing)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <Label htmlFor={`reason-${listing.id}`} className="dm-label">
                  Reason when rejecting or archiving
                </Label>
                <Input
                  id={`reason-${listing.id}`}
                  value={reasons[listing.id] || ''}
                  onChange={(event) => setReasons((current) => ({ ...current, [listing.id]: event.target.value }))}
                  placeholder="e.g. Photos do not match the address, or the price looks like a typo"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => reject(listing)}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Reject with reason
              </Button>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Approving publishes the listing, tells the owner and runs saved-search alerts. Every action here is
              recorded in the audit log.
            </p>
          </article>
        ))}
      </div>

      <AdminListingEditDialog
        listing={editing}
        open={Boolean(editing)}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        onSaved={load}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.title}" will be permanently removed. The owner will be notified and the action recorded in the audit log.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
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