import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Inbox, MessageSquareText, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InquiryThread from '@/components/dashboard/InquiryThread';
import { formatDate, formatDateTime } from '@/lib/format';

const INQUIRY_STATUS = {
  new: { label: 'New', className: 'bg-amber-100 text-amber-900' },
  read: { label: 'Read', className: 'bg-secondary text-muted-foreground' },
  responded: { label: 'Replied', className: 'bg-primary/10 text-primary' },
  closed: { label: 'Closed', className: 'bg-secondary text-muted-foreground' },
};

export default function DashboardLeads() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [inquiries, setInquiries] = useState([]);
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openInquiry, setOpenInquiry] = useState(null);
  const [responses, setResponses] = useState({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [inquiryPage, viewingPage] = await Promise.all([
        base44.entities.Inquiry.filter({ listing_owner_id: user.id }, { sort: '-last_activity', limit: 100 }),
        base44.entities.ViewingRequest.filter({ listing_owner_id: user.id }, { sort: '-created_date', limit: 100 }),
      ]);
      setInquiries(inquiryPage?.items || []);
      setViewings(viewingPage?.items || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const markInquiry = async (inquiry, status) => {
    try {
      await base44.entities.Inquiry.update(inquiry.id, { status, last_activity: new Date().toISOString() });
      load();
    } catch (error) {
      toast({ title: 'Could not update the enquiry', description: error?.message, variant: 'destructive' });
    }
  };

  const respondToViewing = async (request, status) => {
    const response = responses[request.id] || '';
    if (status !== 'confirmed' && !response.trim()) {
      toast({
        title: 'Add a short note',
        description: 'Tell the requester why this time does not work so they can suggest another.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await base44.entities.ViewingRequest.update(request.id, { status, owner_response: response.trim() });
      await base44.entities.Notification.create({
        user_id: request.requester_id,
        type: 'viewing',
        title: status === 'confirmed' ? 'Your viewing is confirmed' : status === 'declined' ? 'Your viewing request was declined' : 'Your viewing update',
        body:
          status === 'confirmed'
            ? `${request.listing_title} — confirmed for ${formatDate(request.preferred_date)} at ${request.preferred_time}.`
            : `${request.listing_title} — the owner replied: ${response.trim()}`,
        link: '/dashboard/requests',
        read: false,
      });
      toast({ title: status === 'confirmed' ? 'Viewing confirmed' : 'Response sent' });
      setResponses((current) => ({ ...current, [request.id]: '' }));
      load();
    } catch (error) {
      toast({ title: 'Could not send the response', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Enquiries and viewings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything sent to your listings, private to you and the person who wrote it.
        </p>
      </div>

      <Tabs defaultValue="enquiries">
        <TabsList>
          <TabsTrigger value="enquiries">
            <MessageSquareText className="mr-1.5 h-4 w-4" />
            Enquiries
          </TabsTrigger>
          <TabsTrigger value="viewings">
            <CalendarCheck className="mr-1.5 h-4 w-4" />
            Viewing requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enquiries" className="mt-6">
          {loading ? <Skeleton className="h-32 rounded-2xl" /> : null}
          {!loading && !inquiries.length ? (
            <EmptyState
              icon={Inbox}
              title="No enquiries yet"
              body="When someone contacts you about a listing, their message appears here with a private reply thread."
            />
          ) : null}
          <div className="space-y-3">
            {inquiries.map((inquiry) => {
              const status = INQUIRY_STATUS[inquiry.status] || INQUIRY_STATUS.new;
              return (
                <article key={inquiry.id} className="dm-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{inquiry.from_name || 'A visitor'}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                        {inquiry.kind === 'rental' ? (
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                            Rental enquiry
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {inquiry.listing_title} · {formatDateTime(inquiry.last_activity || inquiry.created_date)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{inquiry.message}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => setOpenInquiry(inquiry)}>
                        Open thread
                      </Button>
                      {inquiry.status === 'new' ? (
                        <Button size="sm" variant="outline" onClick={() => markInquiry(inquiry, 'read')}>
                          Mark read
                        </Button>
                      ) : null}
                      {inquiry.status !== 'closed' ? (
                        <Button size="sm" variant="ghost" onClick={() => markInquiry(inquiry, 'closed')}>
                          Close
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="viewings" className="mt-6">
          {loading ? <Skeleton className="h-32 rounded-2xl" /> : null}
          {!loading && !viewings.length ? (
            <EmptyState
              icon={CalendarCheck}
              title="No viewing requests yet"
              body="Requests stay pending until you confirm or decline them, and the requester sees the moment you respond."
            />
          ) : null}
          <div className="space-y-3">
            {viewings.map((request) => (
              <article key={request.id} className="dm-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{request.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.listing_title} · requested {formatDateTime(request.created_date)}
                    </p>
                    <p className="mt-2 text-sm">
                      Preferred: <span className="font-medium">{formatDate(request.preferred_date)}</span> at{' '}
                      <span className="font-medium">{request.preferred_time}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.email}
                      {request.phone ? ` · ${request.phone}` : ''}
                    </p>
                    {request.message ? (
                      <p className="mt-2 rounded-xl bg-secondary/60 p-3 text-sm">{request.message}</p>
                    ) : null}
                    {request.owner_response ? (
                      <p className="mt-2 text-xs text-muted-foreground">Your reply: {request.owner_response}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                    {request.status}
                  </span>
                </div>

                {['pending', 'confirmed'].includes(request.status) ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div>
                      <Label htmlFor={`response-${request.id}`} className="dm-label">
                        Your response
                      </Label>
                      <Textarea
                        id={`response-${request.id}`}
                        rows={2}
                        value={responses[request.id] || ''}
                        onChange={(event) =>
                          setResponses((current) => ({ ...current, [request.id]: event.target.value }))
                        }
                        placeholder="Confirmed, or suggest another time."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => respondToViewing(request, 'confirmed')}>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Confirm viewing
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respondToViewing(request, 'declined')}>
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Decline
                      </Button>
                      {request.status === 'confirmed' ? (
                        <Button size="sm" variant="ghost" onClick={() => respondToViewing(request, 'completed')}>
                          Mark completed
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/property/${request.listing_id}`}>View listing</Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(openInquiry)} onOpenChange={(open) => !open && setOpenInquiry(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enquiry thread</DialogTitle>
          </DialogHeader>
          {openInquiry ? (
            <InquiryThread inquiry={openInquiry} currentUserId={user?.id} onChanged={load} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}