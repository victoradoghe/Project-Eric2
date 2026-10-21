import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Inbox, Loader2, Send, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/format';

export default function InquiryThread({ inquiry, currentUserId, onChanged }) {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!inquiry?.id) return;
    setLoading(true);
    try {
      const page = await base44.entities.Message.filter({ inquiry_id: inquiry.id }, { sort: 'created_date', limit: 100 });
      setMessages(page?.items || []);
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [inquiry?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (event) => {
    event.preventDefault();
    if (!reply.trim() || !user?.id) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        inquiry_id: inquiry.id,
        listing_id: inquiry.listing_id,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.id === inquiry.listing_owner_id ? (inquiry.owner_role || 'owner') : 'buyer',
        body: reply.trim(),
        participants: inquiry.participants?.length ? inquiry.participants : [inquiry.from_user_id, inquiry.listing_owner_id],
        read_by: [user.id],
      });

      await base44.entities.Inquiry.update(inquiry.id, {
        status: user.id === inquiry.listing_owner_id ? 'responded' : 'new',
        last_activity: new Date().toISOString(),
      });

      setReply('');
      await load();
      toast({ title: 'Reply sent', description: 'Everyone in this conversation can see it.' });
      onChanged?.();
    } catch (error) {
      toast({ title: 'Could not send the reply', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const participants = [
    { id: inquiry?.from_user_id, name: inquiry?.from_name || 'Buyer or renter', role: 'sender' },
    { id: inquiry?.listing_owner_id, name: inquiry?.listing_owner_name || 'Listing owner', role: 'owner' },
  ].filter((item) => item.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{inquiry?.subject || 'Enquiry'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {inquiry?.listing_title} · started {formatDateTime(inquiry?.created_date)}
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/property/${inquiry?.listing_id}`}>
            View listing
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants</p>
        <p className="mt-2 text-sm">
          {participants.map((person) => person.name).join(' · ') || 'Conversation participants'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Only these people and administrators handling a report can read this conversation.
        </p>
      </div>

      <div className="space-y-3">
        <article className="rounded-2xl bg-secondary/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {inquiry?.from_name || 'Sender'} · {formatDateTime(inquiry?.created_date)}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{inquiry?.message}</p>
        </article>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading replies…
          </p>
        ) : null}

        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId;
          return (
            <article
              key={message.id}
              className={`rounded-2xl p-4 ${isMine ? 'bg-primary/10' : 'bg-secondary/60'}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isMine ? 'You' : message.sender_name || 'Reply'} · {formatDateTime(message.created_date)}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{message.body}</p>
            </article>
          );
        })}

        {!loading && !messages.length ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" />
            No replies yet. This thread keeps every message together.
          </p>
        ) : null}
      </div>

      <form onSubmit={send} className="space-y-3">
        <Label htmlFor={`reply-${inquiry?.id}`} className="dm-label">
          Reply
        </Label>
        <Textarea
          id={`reply-${inquiry?.id}`}
          rows={3}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Write your reply…"
        />
        <Button type="submit" disabled={sending}>
          <Send className="mr-2 h-4 w-4" />
          {sending ? 'Sending…' : 'Send reply'}
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Replies are only visible to the people in this conversation.
        </p>
      </form>
    </div>
  );
}