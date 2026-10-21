import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatRelative } from '@/lib/format';

export default function AdminMessages() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const page = await base44.entities.AdminMessage.filter({}, { sort: '-created_date', limit: 200 });
      const items = page?.items || [];
      const byUser = new Map();
      for (const message of items) {
        const existing = byUser.get(message.user_id);
        if (!existing || new Date(message.created_date) > new Date(existing.last_at)) {
          byUser.set(message.user_id, {
            user_id: message.user_id,
            user_name: message.user_name || message.user_email || 'Unknown',
            user_email: message.user_email,
            last_at: message.created_date,
            last_body: message.body,
            unread: 0,
          });
        }
      }
      // Count unread messages from clients per thread
      for (const message of items) {
        const thread = byUser.get(message.user_id);
        if (thread && message.sender === 'client' && !message.read) {
          thread.unread += 1;
        }
      }
      setThreads(Array.from(byUser.values()).sort((a, b) => new Date(b.last_at) - new Date(a.last_at)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const unsubscribe = base44.entities.AdminMessage.subscribe(() => {
      loadThreads();
      if (activeUserId) loadThread(activeUserId);
    });
    return unsubscribe;
  }, [user?.id, loadThreads, activeUserId]);

  const loadThread = useCallback(async (userId) => {
    const page = await base44.entities.AdminMessage.filter(
      { user_id: userId },
      { sort: 'created_date', limit: 200 },
    );
    setActiveMessages(page?.items || []);
    // Mark client messages as read
    base44.entities.AdminMessage.updateMany(
      { user_id: userId, sender: 'client', read: false },
      { $set: { read: true } },
    ).catch(() => {});
  }, []);

  const openThread = (userId) => {
    setActiveUserId(userId);
    loadThread(userId);
    loadThreads();
  };

  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeUserId || !user?.id) return;
    setSending(true);
    try {
      const thread = threads.find((t) => t.user_id === activeUserId);
      await base44.entities.AdminMessage.create({
        user_id: activeUserId,
        user_name: thread?.user_name,
        user_email: thread?.user_email,
        body,
        sender: 'admin',
        sender_id: user.id,
        sender_name: user.full_name || user.email || 'Dwellmark team',
        read: false,
      });
      setDraft('');
      loadThread(activeUserId);
      loadThreads();
    } catch (error) {
      toast({ title: 'Could not send reply', description: error?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading && !threads.length) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!threads.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
        <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-3 font-semibold">No client messages yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          When a client sends a message from their dashboard, their conversation appears here for you to
          read and reply.
        </p>
      </div>
    );
  }

  const activeThread = threads.find((t) => t.user_id === activeUserId);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-2">
        <h2 className="px-1 font-display text-lg font-semibold">Conversations</h2>
        {threads.map((thread) => (
          <button
            key={thread.user_id}
            type="button"
            onClick={() => openThread(thread.user_id)}
            className={`dm-focus w-full rounded-xl border p-3 text-left transition ${
              activeUserId === thread.user_id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-white hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{thread.user_name}</p>
              {thread.unread ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {thread.unread}
                </span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{thread.last_body}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{formatRelative(thread.last_at)}</p>
          </button>
        ))}
      </div>

      <div className="dm-card flex h-[60vh] min-h-[400px] flex-col">
        {activeUserId ? (
          <>
            <div className="border-b border-border p-4">
              <p className="font-semibold">{activeThread?.user_name || 'Conversation'}</p>
              <p className="text-xs text-muted-foreground">{activeThread?.user_email}</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {activeMessages.map((message) => {
                const mine = message.sender === 'admin';
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{message.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDateTime(message.created_date)}
                      </p>
                    </div>
                  </div>
                );
              })}
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
                placeholder="Reply to this client…"
                className="dm-focus max-h-32 flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
              />
              <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            Select a conversation to read and reply.
          </div>
        )}
      </div>
    </div>
  );
}