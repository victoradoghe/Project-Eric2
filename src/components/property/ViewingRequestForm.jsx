import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SignInPrompt from '@/components/forms/SignInPrompt';
import { notifyInquiryEvent } from '@/lib/listingsApi';

const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function ViewingRequestForm({ listing, onCreated }) {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    preferred_date: '',
    preferred_time: '10:00',
    message: '',
  });
  const [sending, setSending] = useState(false);

  if (!user?.id) {
    return (
      <SignInPrompt
        title="Sign in to request a viewing"
        description="Viewing requests are private and stay pending until the listing owner confirms them."
      />
    );
  }

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.preferred_date) {
      toast({ title: 'Choose a preferred date', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const request = await base44.entities.ViewingRequest.create({
        listing_id: listing.id,
        property_id: listing.property_id,
        listing_title: listing.title,
        listing_owner_id: listing.owner_id,
        requester_id: user.id,
        name: form.name || user.full_name || user.email,
        email: form.email || user.email,
        phone: form.phone,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
        message: form.message,
        status: 'pending',
        participants: [user.id, listing.owner_id].filter(Boolean),
      });

      await notifyInquiryEvent('viewing', request.id);

      toast({
        title: 'Viewing request sent',
        description: 'This is pending until the listing owner confirms it. You can follow it in your dashboard.',
      });
      setForm((current) => ({ ...current, message: '' }));
      onCreated?.();
    } catch (error) {
      toast({ title: 'Could not send the request', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="viewing-name" className="dm-label">
            Your name
          </Label>
          <Input id="viewing-name" value={form.name} onChange={(event) => update('name')(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="viewing-email" className="dm-label">
            Email
          </Label>
          <Input
            id="viewing-email"
            type="email"
            value={form.email}
            onChange={(event) => update('email')(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="viewing-date" className="dm-label">
            Preferred date
          </Label>
          <Input
            id="viewing-date"
            type="date"
            value={form.preferred_date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => update('preferred_date')(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="viewing-time" className="dm-label">
            Preferred time
          </Label>
          <select
            id="viewing-time"
            value={form.preferred_time}
            onChange={(event) => update('preferred_time')(event.target.value)}
            className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="viewing-phone" className="dm-label">
          Phone (optional)
        </Label>
        <Input id="viewing-phone" value={form.phone} onChange={(event) => update('phone')(event.target.value)} />
      </div>

      <div>
        <Label htmlFor="viewing-message" className="dm-label">
          Anything the owner should know?
        </Label>
        <Textarea
          id="viewing-message"
          rows={3}
          value={form.message}
          onChange={(event) => update('message')(event.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={sending}>
        <CalendarPlus className="mr-2 h-4 w-4" />
        {sending ? 'Sending…' : 'Request a viewing'}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Requests are shown as pending until the owner or landlord confirms. Dwellmark does not confirm
        viewings on their behalf.
      </p>
    </form>
  );
}