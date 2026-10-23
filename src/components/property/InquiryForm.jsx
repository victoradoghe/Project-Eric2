import { useState } from 'react';
import { Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SignInPrompt from '@/components/forms/SignInPrompt';
import { notifyInquiryEvent } from '@/lib/listingsApi';

const DEFAULT_SUBJECT = 'I would like more information about this property';

export default function InquiryForm({ listing, compact = false }) {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  if (!user?.id) {
    return (
      <SignInPrompt
        title="Sign in to contact the listing owner"
        description="Your enquiry is saved privately and only the owner or landlord behind this listing can read it."
      />
    );
  }

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.message.trim()) {
      toast({ title: 'Add a short message', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const inquiry = await base44.entities.Inquiry.create({
        listing_id: listing.id,
        property_id: listing.property_id,
        listing_title: listing.title,
        listing_owner_id: listing.owner_id,
        listing_owner_name: listing.owner_name || '',
        from_user_id: user.id,
        from_name: form.name || user.full_name || user.email,
        from_email: form.email || user.email,
        from_phone: form.phone,
        subject: DEFAULT_SUBJECT,
        message: form.message.trim(),
        kind: listing.listing_type === 'rent' ? 'rental' : 'general',
        status: 'new',
        participants: [user.id, listing.owner_id].filter(Boolean),
        last_activity: new Date().toISOString(),
      });

      await notifyInquiryEvent('inquiry', inquiry.id);

      setForm((current) => ({ ...current, message: '' }));
      toast({
        title: 'Enquiry sent',
        description: 'The listing owner can now see it in their dashboard and reply to you.',
      });
    } catch (error) {
      toast({ title: 'Could not send your enquiry', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {!compact ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="inquiry-name" className="dm-label">
              Your name
            </Label>
            <Input id="inquiry-name" value={form.name} onChange={(event) => update('name')(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="inquiry-phone" className="dm-label">
              Phone (optional)
            </Label>
            <Input id="inquiry-phone" value={form.phone} onChange={(event) => update('phone')(event.target.value)} />
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor="inquiry-email" className="dm-label">
          Email
        </Label>
        <Input
          id="inquiry-email"
          type="email"
          value={form.email}
          onChange={(event) => update('email')(event.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="inquiry-message" className="dm-label">
          Message
        </Label>
        <Textarea
          id="inquiry-message"
          rows={4}
          value={form.message}
          placeholder="Ask about availability, the neighbourhood, or anything you would like to know."
          onChange={(event) => update('message')(event.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={sending}>
        <Send className="mr-2 h-4 w-4" />
        {sending ? 'Sending…' : 'Send enquiry'}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Your message is stored with this listing and delivered to the owner only. Replies appear in your
        dashboard.
      </p>
    </form>
  );
}