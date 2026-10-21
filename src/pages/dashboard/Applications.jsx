import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Lock, Mail, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime } from '@/lib/format';

const STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Not accepted' },
];

export default function DashboardApplications() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const page = await base44.entities.RentalApplication.filter(
        { listing_owner_id: user.id },
        { sort: '-created_date', limit: 100 },
      );
      setApplications(page?.items || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (application, patch) => {
    try {
      await base44.entities.RentalApplication.update(application.id, patch);
      await base44.entities.Notification.create({
        user_id: application.applicant_id,
        type: 'application',
        title: 'Your rental application was updated',
        body: `${application.listing_title} — status: ${(patch.status || application.status).replace(/_/g, ' ')}.`,
        link: '/dashboard/requests',
        read: false,
      });
      toast({ title: 'Application updated' });
      load();
    } catch (error) {
      toast({ title: 'Could not update the application', description: error?.message, variant: 'destructive' });
    }
  };

  const openDocument = async (document) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: document.file_uri });
      window.open(signed_url, '_blank', 'noopener');
    } catch (error) {
      toast({
        title: 'Could not open that document',
        description: 'Signed links expire quickly — try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Rental applications</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Applications submitted to your rental listings, with any documents the applicant attached. Documents
          are stored privately and opened through short-lived links.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {!loading && !applications.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 font-semibold">No applications yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Applications appear here when a renter applies to one of your listings that accepts applications.
            You can switch that on when editing a rental listing.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {applications.map((application) => (
          <article key={application.id} className="dm-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">{application.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {application.listing_title} · applied {formatDateTime(application.created_date)}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {application.email}
                  </span>
                  {application.phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {application.phone}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Employment</dt>
                    <dd className="capitalize">{(application.employment_status || 'not stated').replace(/_/g, ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Monthly income</dt>
                    <dd>{application.monthly_income ? `$${Number(application.monthly_income).toLocaleString('en-US')}` : 'Not stated'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Move-in date</dt>
                    <dd>{application.move_in_date ? formatDate(application.move_in_date) : 'Not stated'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Occupants</dt>
                    <dd>{application.occupants || 1}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Pets</dt>
                    <dd>{application.pets || 'None stated'}</dd>
                  </div>
                </dl>
                {application.message ? (
                  <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">{application.message}</p>
                ) : null}

                {application.documents?.length ? (
                  <div className="mt-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      Attached documents (private)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {application.documents.map((document) => (
                        <Button
                          key={document.file_uri}
                          size="sm"
                          variant="outline"
                          onClick={() => openDocument(document)}
                        >
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          {document.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="w-full max-w-xs space-y-3">
                <div>
                  <Label htmlFor={`status-${application.id}`} className="dm-label">
                    Decision
                  </Label>
                  <select
                    id={`status-${application.id}`}
                    value={application.status}
                    onChange={(event) => update(application, { status: event.target.value })}
                    className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`notes-${application.id}`} className="dm-label">
                    Note to the applicant
                  </Label>
                  <Textarea
                    id={`notes-${application.id}`}
                    rows={2}
                    value={notes[application.id] ?? application.owner_notes ?? ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => update(application, { owner_notes: notes[application.id] ?? '' })}
                  >
                    Save note
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/property/${application.listing_id}`}>View listing</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dwellmark does not run credit checks, background checks or references on your behalf, and does
                  not produce tenancy agreements.
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}