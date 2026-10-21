import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, Flag, Inbox, Mail, ShieldQuestion } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  resolveReport,
  setAgencyVerification,
  setAgentVerification,
  updateContactMessage,
} from '@/lib/adminActions';
import { formatDateTime } from '@/lib/format';

const REPORT_STATUS = {
  open: 'bg-amber-100 text-amber-900',
  reviewing: 'bg-primary/10 text-primary',
  resolved: 'bg-emerald-100 text-emerald-900',
  dismissed: 'bg-secondary text-muted-foreground',
};

export default function AdminReports() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportPage, messagePage, agentPage, agencyPage] = await Promise.all([
        base44.entities.Report.filter({}, { sort: '-created_date', limit: 100 }),
        base44.entities.ContactMessage.filter({}, { sort: '-created_date', limit: 100 }),
        base44.entities.AgentProfile.filter({ verification_status: 'pending' }, { limit: 50 }),
        base44.entities.Agency.filter({ verification_status: 'pending' }, { limit: 50 }),
      ]);
      setReports(reportPage?.items || []);
      setMessages(messagePage?.items || []);
      setAgents(agentPage?.items || []);
      setAgencies(agencyPage?.items || []);
    } catch (error) {
      toast({ title: 'Could not load the moderation data', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, successMessage) => {
    try {
      await fn();
      toast({ title: successMessage });
      load();
    } catch (error) {
      toast({ title: 'That action failed', description: error?.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Flag className="h-4 w-4 text-primary" />
          Reported listings and users
        </h2>
        {!reports.length ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No reports have been submitted.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="dm-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold capitalize">{report.reason?.replace(/_/g, ' ')}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${REPORT_STATUS[report.status] || REPORT_STATUS.open}`}>
                      {report.status}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {report.target_type}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm">
                    {report.target_type === 'listing' ? (
                      <a href={`/property/${report.target_id}`} className="font-medium text-primary hover:underline">
                        {report.target_label || report.target_id}
                      </a>
                    ) : (
                      <span>{report.target_label || report.target_id}</span>
                    )}
                  </p>
                  {report.details ? (
                    <p className="mt-2 rounded-xl bg-secondary/60 p-3 text-sm">{report.details}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reported {formatDateTime(report.created_date)} by {report.reporter_email || 'a visitor'}
                    {report.handled_by ? ` · handled by ${report.handled_by}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => run(() => resolveReport(user, report, { status: 'resolved', note: notes[report.id] || 'Reviewed and resolved' }), 'Report resolved')}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run(() => resolveReport(user, report, { status: 'dismissed', note: notes[report.id] || 'Reviewed, no action needed' }), 'Report dismissed')}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor={`report-note-${report.id}`} className="dm-label">
                  Resolution note
                </Label>
                <Input
                  id={`report-note-${report.id}`}
                  value={notes[report.id] || ''}
                  onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                  placeholder="What did you check, and what did you decide?"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Verification requests
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Marking a profile verified states that you have checked the licence details. Approval here is what
          makes a verified badge appear — nothing else does.
        </p>
        {!agents.length && !agencies.length ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No verification requests are waiting.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {agents.map((agent) => (
            <article key={agent.id} className="dm-card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">{agent.display_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Agent · {agent.agency_name || 'independent'}
                  {agent.license_number ? ` · licence ${agent.license_number}` : ' · no licence number supplied'}
                  {agent.license_state ? ` (${agent.license_state})` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => run(() => setAgentVerification(user, agent, 'verified'), 'Agent verified')}>
                  <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                  Verify
                </Button>
                <Button size="sm" variant="outline" onClick={() => run(() => setAgentVerification(user, agent, 'unverified'), 'Verification removed')}>
                  <ShieldQuestion className="mr-1.5 h-3.5 w-3.5" />
                  Not verified
                </Button>
              </div>
            </article>
          ))}

          {agencies.map((agency) => (
            <article key={agency.id} className="dm-card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">{agency.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Agency · {[agency.city, agency.state].filter(Boolean).join(', ') || 'location not stated'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => run(() => setAgencyVerification(user, agency, 'verified'), 'Agency verified')}>
                  Verify
                </Button>
                <Button size="sm" variant="outline" onClick={() => run(() => setAgencyVerification(user, agency, 'unverified'), 'Verification removed')}>
                  Not verified
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Inbox className="h-4 w-4 text-primary" />
          Contact messages
        </h2>
        {!messages.length ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No contact messages yet.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="dm-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{message.subject || message.topic || 'Message'}</p>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {message.status}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {message.topic}
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {message.name} · {message.email}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm">{message.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Received {formatDateTime(message.created_date)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run(() => updateContactMessage(user, message, { status: 'answered', note: notes[message.id] || 'Replied by email' }), 'Marked as answered')}
                  >
                    Mark answered
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => run(() => updateContactMessage(user, message, { status: 'closed', note: notes[message.id] || 'Closed' }), 'Message closed')}
                  >
                    Close
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor={`message-note-${message.id}`} className="dm-label">
                  Internal note
                </Label>
                <Input
                  id={`message-note-${message.id}`}
                  value={notes[message.id] || ''}
                  onChange={(event) => setNotes((current) => ({ ...current, [message.id]: event.target.value }))}
                  placeholder="What did you do about this message?"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Replies to contact messages are sent by you, outside the platform. Marking a message answered records
        that you did.
      </p>
    </div>
  );
}