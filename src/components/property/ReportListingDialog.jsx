import { useState } from 'react';
import { Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const REASONS = [
  { value: 'incorrect_information', label: 'Incorrect information' },
  { value: 'already_sold', label: 'Already sold or rented' },
  { value: 'wrong_price', label: 'Price looks wrong' },
  { value: 'duplicate', label: 'Duplicate listing' },
  { value: 'suspected_fraud', label: 'Suspected fraud or scam' },
  { value: 'offensive_content', label: 'Offensive content' },
  { value: 'other', label: 'Something else' },
];

export default function ReportListingDialog({ listing }) {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('incorrect_information');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user?.id,
        reporter_email: user?.email,
        target_type: 'listing',
        target_id: listing.id,
        target_label: listing.title,
        reason,
        details,
        status: 'open',
      });
      toast({ title: 'Report submitted', description: 'An administrator will review this listing.' });
      setOpen(false);
      setDetails('');
    } catch (error) {
      toast({ title: 'Could not submit the report', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="dm-focus inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:text-destructive"
        >
          <Flag className="h-3.5 w-3.5" />
          Report listing
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>
            Reports go to the moderation queue with your name attached only to administrators.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="report-reason" className="dm-label">
              Reason
            </Label>
            <select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="report-details" className="dm-label">
              Details (optional)
            </Label>
            <Textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Anything that helps an administrator review this quickly."
            />
          </div>
          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? 'Submitting…' : 'Submit report'}
          </Button>
          {!user?.id ? (
            <p className="text-xs text-muted-foreground">
              You are not signed in — the report is recorded without an account reference.
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}