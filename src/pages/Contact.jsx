import { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BRAND } from '@/lib/constants';
import { WhatsAppIcon, whatsappLink } from '@/components/WhatsAppChat';

const TOPICS = [
  { value: 'general', label: 'General question' },
  { value: 'listing_help', label: 'Help with a listing' },
  { value: 'report_problem', label: 'Report a problem' },
  { value: 'agent_support', label: 'Agent or agency support' },
  { value: 'privacy', label: 'Privacy request' },
  { value: 'billing', label: 'Account or billing question' },
];

export default function Contact() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    topic: 'general',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await base44.entities.ContactMessage.create({
        name: form.name,
        email: form.email,
        topic: form.topic,
        subject: form.subject,
        message: form.message,
        status: 'new',
      });
      setSent(true);
      toast({ title: 'Message sent', description: 'An administrator will read it and reply by email.' });
    } catch (error) {
      toast({ title: 'Could not send the message', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="dm-container py-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h1 className="font-display text-3xl font-semibold">Contact {BRAND.name}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Questions about a listing, an account, or something that looks wrong? Send a message and an
            administrator will read it.
          </p>

          {sent ? (
            <div className="mt-8 rounded-2xl border border-primary/30 bg-accent/50 p-8 text-center">
              <p className="font-display text-xl font-semibold">Thanks — your message is with us</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We reply by email to the address you provided. If your message was about a specific listing,
                mentioning the listing address helps us answer faster.
              </p>
              <Button className="mt-5" variant="outline" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="dm-card mt-8 space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="c-name" className="dm-label">
                    Your name
                  </Label>
                  <Input id="c-name" value={form.name} onChange={(event) => update('name')(event.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="c-email" className="dm-label">
                    Email
                  </Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email')(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="c-topic" className="dm-label">
                    Topic
                  </Label>
                  <select
                    id="c-topic"
                    value={form.topic}
                    onChange={(event) => update('topic')(event.target.value)}
                    className="dm-focus h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {TOPICS.map((topic) => (
                      <option key={topic.value} value={topic.value}>
                        {topic.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="c-subject" className="dm-label">
                    Subject
                  </Label>
                  <Input id="c-subject" value={form.subject} onChange={(event) => update('subject')(event.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="c-message" className="dm-label">
                  Message
                </Label>
                <Textarea
                  id="c-message"
                  rows={6}
                  value={form.message}
                  onChange={(event) => update('message')(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={sending}>
                <Send className="mr-2 h-4 w-4" />
                {sending ? 'Sending…' : 'Send message'}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Keep personal documents out of this form. If you are reporting a listing, the report link on the
                listing itself reaches the moderation queue faster.
              </p>
            </form>
          )}
        </div>

        <aside className="dm-card h-fit p-6">
          <h2 className="font-display text-lg font-semibold">Other ways to reach us</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              {BRAND.email}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              {BRAND.phone}
            </li>
            <li>
              <a
                href={whatsappLink(BRAND.phone, `Hello ${BRAND.name}, I have a question.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="dm-focus inline-flex items-center gap-2 rounded text-sm font-medium text-[#128C7E] transition hover:text-[#0c6a5e]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {BRAND.address}
            </li>
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            These are demonstration contact details for a sample marketplace. Replace them with your own
            before publishing the app.
          </p>
        </aside>
      </div>
    </div>
  );
}