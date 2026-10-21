import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, FileText, MessageSquareText, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InquiryThread from '@/components/dashboard/InquiryThread';
import { formatDate, formatDateTime } from '@/lib/format';

const VIEWING_STATUS = {
  pending: { label: 'Pending confirmation', className: 'bg-amber-100 text-amber-900' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary' },
  declined: { label: 'Declined', className: 'bg-secondary text-muted-foreground' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-900' },
  cancelled: { label: 'Cancelled', className: 'bg-secondary text-muted-foreground' },
};

const APPLICATION_STATUS = {
  submitted: { label: 'Submitted', className: 'bg-amber-100 text-amber-900' },
  under_review: { label: 'Under review', className: 'bg-primary/10 text-primary' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-900' },
  denied: { label: 'Not accepted', className: 'bg-secondary text-muted-foreground' },
  withdrawn: { label: 'Withdrawn', className: 'bg-secondary text-muted-foreground' },
};

export default function DashboardRequests() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [viewings, setViewings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openInquiry, setOpenInquiry] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const safeFetch = async (entity, query) => {
      try {
        const page = await entity.filter(query, { sort: '-created_date', limit: 50 });
        return page?.items || [];
      } catch (err) {
        console.error('Failed to load requests', err);
        return null;
      }
    };
    const [viewingItems, inquiryItems, applicationItems] = await Promise.all([
      safeFetch(base44.entities.ViewingRequest, { requester_id: user.id }),
      safeFetch(base44.entities.Inquiry, { from_user_id: user.id }),
      safeFetch(base44.entities.RentalApplication, { applicant_id: user.id }),
    ]);
    const failed = [viewingItems, inquiryItems, applicationItems].some((items) => items === null);
    if (failed) {
      setError('Some sections could not be loaded. Please try again.');
      toast({ title: 'Some sections could not be loaded', variant: 'destructive' });
    }
    setViewings(viewingItems || []);
    setInquiries(inquiryItems || []);
    setApplications(applicationItems || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const cancelViewing = async (request) => {
    try {
      await base44.entities.ViewingRequest.update(request.id, { status: 'cancelled' });
      toast({ title: 'Viewing request cancelled' });
      load();
    } catch (error) {
      toast({ title: 'Could not cancel the request', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My requests</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything you have asked a listing owner about, and where each one stands.
        </p>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      ) : null}

      <Tabs defaultValue="viewings">
        <TabsList>
          <TabsTrigger value="viewings">
            <CalendarCheck className="mr-1.5 h-4 w-4" />
            Viewings
          </TabsTrigger>
          <TabsTrigger value="enquiries">
            <MessageSquareText className="mr-1.5 h-4 w-4" />
            Enquiries
          </TabsTrigger>
          <TabsTrigger value="applications">
            <FileText className="mr-1.5 h-4 w-4" />
            Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewings" className="mt-6">
          {loading ? <Skeleton className="h-32 rounded-2xl" /> : null}
          {!loading && !viewings.length ? (
            <EmptyState
              title="No viewing requests yet"
              body="Request a viewing from any listing page and it will appear here until the owner responds."
            />
          ) : null}
          <div className="space-y-3">
            {viewings.map((request) => {
              const status = VIEWING_STATUS[request.status] || VIEWING_STATUS.pending;
              return (
                <article key={request.id} className="dm-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{request.listing_title || 'Listing'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Preferred {formatDate(request.preferred_date)} at {request.preferred_time}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Requested {formatDateTime(request.created_date)}
                      </p>
                      {request.owner_response ? (
                        <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">
                          <span className="font-semibold">Owner's response:</span> {request.owner_response}
                        </p>
                      ) : null}
                      {request.status === 'pending' ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Pending means the owner has not confirmed yet. Nothing is booked until they do.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/property/${request.listing_id}`}>View listing</Link>
                        </Button>
                        {request.status === 'pending' ? (
                          <Button size="sm" variant="ghost" onClick={() => cancelViewing(request)}>
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="enquiries" className="mt-6">
          {loading ? <Skeleton className="h-32 rounded-2xl" /> : null}
          {!loading && !inquiries.length ? (
            <EmptyState
              title="No enquiries sent"
              body="Use the contact form on a listing to ask the owner a question. Your thread appears here."
            />
          ) : null}
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
              <article key={inquiry.id} className="dm-card flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-semibold">{inquiry.listing_title || 'Listing'}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{inquiry.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sent {formatDateTime(inquiry.created_date)} · status {inquiry.status}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenInquiry(inquiry)}>
                  Open thread
                </Button>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          {loading ? <Skeleton className="h-32 rounded-2xl" /> : null}
          {!loading && !applications.length ? (
            <EmptyState
              title="No applications submitted"
              body="Where a landlord accepts applications, you can apply from the rental listing page."
            />
          ) : null}
          <div className="space-y-3">
            {applications.map((application) => {
              const status = APPLICATION_STATUS[application.status] || APPLICATION_STATUS.submitted;
              return (
                <article key={application.id} className="dm-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{application.listing_title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {formatDateTime(application.created_date)} ·{' '}
                        {(application.documents || []).length} document
                        {(application.documents || []).length === 1 ? '' : 's'} attached
                      </p>
                      {application.owner_notes ? (
                        <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">{application.owner_notes}</p>
                      ) : null}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(openInquiry)} onOpenChange={(open) => !open && setOpenInquiry(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your enquiry</DialogTitle>
          </DialogHeader>
          {openInquiry ? (
            <InquiryThread inquiry={openInquiry} currentUserId={user?.id} onChanged={load} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <Button className="mt-4" variant="outline" asChild>
        <Link to="/search">Browse listings</Link>
      </Button>
    </div>
  );
}