import { useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { notifyInquiryEvent } from '@/lib/listingsApi';

const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

export default function RentalApplicationDialog({ listing, open, onOpenChange, onCreated }) {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    employment_status: 'employed_full_time',
    employer: '',
    monthly_income: '',
    move_in_date: listing?.available_from || '',
    lease_months: listing?.lease_months || 12,
    occupants: 1,
    pets: '',
    message: '',
  });
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (documents.length + files.length > MAX_FILES) {
      toast({ title: `You can attach up to ${MAX_FILES} documents`, variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!ALLOWED.includes(file.type)) {
          toast({ title: `${file.name} is not a PDF, JPG or PNG`, variant: 'destructive' });
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast({ title: `${file.name} is larger than 5 MB`, variant: 'destructive' });
          continue;
        }
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        uploaded.push({ name: file.name, file_uri, uploaded_date: new Date().toISOString() });
      }
      if (uploaded.length) setDocuments((current) => [...current, ...uploaded]);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'The document could not be uploaded. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      toast({ title: 'Sign in to submit an application', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const application = await base44.entities.RentalApplication.create({
        listing_id: listing.id,
        property_id: listing.property_id,
        listing_title: listing.title,
        listing_owner_id: listing.owner_id,
        applicant_id: user.id,
        name: form.name || user.full_name || user.email,
        email: form.email || user.email,
        phone: form.phone,
        employment_status: form.employment_status,
        employer: form.employer,
        monthly_income: Number(form.monthly_income) || undefined,
        move_in_date: form.move_in_date,
        lease_months: Number(form.lease_months) || undefined,
        occupants: Number(form.occupants) || 1,
        pets: form.pets,
        message: form.message,
        documents,
        status: 'submitted',
      });

      await notifyInquiryEvent('application', application.id);

      toast({
        title: 'Application submitted',
        description: 'The landlord can review it in their dashboard. You will see status changes in your account.',
      });
      onOpenChange?.(false);
      onCreated?.();
    } catch (error) {
      toast({ title: 'Could not submit the application', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to rent this home</DialogTitle>
          <DialogDescription>
            The landlord receives your details and any documents you attach. Nothing is shared publicly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="app-name" className="dm-label">
                Full name
              </Label>
              <Input id="app-name" value={form.name} onChange={(event) => update('name')(event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="app-email" className="dm-label">
                Email
              </Label>
              <Input
                id="app-email"
                type="email"
                value={form.email}
                onChange={(event) => update('email')(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="app-phone" className="dm-label">
                Phone
              </Label>
              <Input id="app-phone" value={form.phone} onChange={(event) => update('phone')(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="app-employment" className="dm-label">
                Employment
              </Label>
              <select
                id="app-employment"
                value={form.employment_status}
                onChange={(event) => update('employment_status')(event.target.value)}
                className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="employed_full_time">Employed full time</option>
                <option value="employed_part_time">Employed part time</option>
                <option value="self_employed">Self employed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="app-employer" className="dm-label">
                Employer
              </Label>
              <Input id="app-employer" value={form.employer} onChange={(event) => update('employer')(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="app-income" className="dm-label">
                Monthly income
              </Label>
              <Input
                id="app-income"
                type="number"
                value={form.monthly_income}
                onChange={(event) => update('monthly_income')(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="app-move-in" className="dm-label">
                Move-in date
              </Label>
              <Input
                id="app-move-in"
                type="date"
                value={form.move_in_date}
                onChange={(event) => update('move_in_date')(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="app-occupants" className="dm-label">
                Occupants
              </Label>
              <Input
                id="app-occupants"
                type="number"
                min="1"
                value={form.occupants}
                onChange={(event) => update('occupants')(event.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="app-pets" className="dm-label">
              Pets
            </Label>
            <Input
              id="app-pets"
              value={form.pets}
              placeholder="None, or describe the pets you would bring"
              onChange={(event) => update('pets')(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="app-message" className="dm-label">
              Message to the landlord
            </Label>
            <Textarea
              id="app-message"
              rows={3}
              value={form.message}
              onChange={(event) => update('message')(event.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Supporting documents</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Up to {MAX_FILES} files — PDF, JPG or PNG, 5 MB each. Stored privately.
                </p>
              </div>
              <label className="dm-focus inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:bg-secondary">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading…' : 'Add file'}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={handleFiles}
                  disabled={uploading}
                />
              </label>
            </div>
            {documents.length ? (
              <ul className="mt-3 space-y-2">
                {documents.map((document) => (
                  <li
                    key={document.file_uri}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{document.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDocuments((current) => current.filter((item) => item.file_uri !== document.file_uri))
                      }
                      className="dm-focus rounded-lg p-1 text-muted-foreground transition hover:text-destructive"
                      aria-label={`Remove ${document.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Dwellmark does not run credit checks, background checks or electronic signatures. Only attach
            what the landlord has asked for.
          </p>

          <Button type="submit" className="w-full" disabled={sending || uploading}>
            {sending ? 'Submitting…' : 'Submit application'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}