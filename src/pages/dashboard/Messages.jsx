import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';

export default function DashboardMessages() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const page = await base44.entities.AdminMessage.filter(
        { user_id: user.id },
        { sort: 'created_date', limit: 200 },
      );
      setMessages(page?.items || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: pick up admin replies without a manual refresh.
  useEffect(() => {
    if (!user?.id) return undefined;
    const unsubscribe = base44.entities.AdminMessage.subscribe(() => load());
    return unsubscribe;
  }, [user?.id, load]);

  // Mark admin messages as read once the thread is open.
  useEffect(() => {
    if (!user?.id || loading || !messages.length) return;
    base44.entities.AdminMessage.updateMany(
      { user_id: user.id, sender: 'admin', read: false },
      { $set: { read: true } },
    ).catch(() => {});
  }, [user?.id, loading, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !user?.id) return;
    setSending(true);
    try {
      await base44.entities.AdminMessage.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        body,
        sender: 'client',
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        read: false,
      });
      setDraft('');
      load();
    } catch (error) {
      toast({ title: 'Could not send message', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Messages with Dwellmark</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A private thread between you and the Dwellmark team. Ask about a listing, report a problem or
          get help with your account.
        </p>
      </div>

      <div className="dm-card flex h-[60vh] min-h-[400px] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : null}

          {!loading && !messages.length ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="font-semibold">No messages yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Send a message below to start a conversation with the Dwellmark team.
                </p>
              </div>
            </div>
          ) : null}

          {!loading
            ? messages.map((message) => {
                const mine = message.sender === 'client';
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {!mine ? (
                        <p className="mb-0.5 text-xs font-semibold text-muted-foreground">
                          {message.sender_name || 'Dwellmark team'}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-line leading-relaxed">{message.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDateTime(message.created_date)}
                      </p>
                    </div>
                  </div>
                );
              })
            : null}
        </div>

        <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-4">
          <textarea
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send(event);
              }
            }}
            placeholder="Type a message…"
            className="dm-focus max-h-32 flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
          />
          <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}