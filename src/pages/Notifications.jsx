import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CalendarCheck, Heart, Home, Inbox, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { Link } from 'react-router-dom';

const TYPE_META = {
  new_message: { icon: MessageSquare, label: 'New message' },
  viewing_confirmed: { icon: CalendarCheck, label: 'Viewing confirmed' },
  new_application: { icon: Inbox, label: 'New application' },
  listing_approved: { icon: Home, label: 'Listing approved' },
  saved_search_match: { icon: Heart, label: 'New match' },
};

function NotificationIcon({ type }) {
  const meta = TYPE_META[type] || { icon: Bell };
  const Icon = meta.icon;
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function Notifications() {
  const { user } = useAuth() || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await base44.entities.Notification.filter(
        { user_id: user.id },
        { sort: '-created_date', limit: 100 },
      );
      setNotifications(data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await base44.entities.Notification.updateMany(
      { user_id: user.id, read: false },
      { $set: { read: true } },
    ).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true }).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) {
    return (
      <div className="dm-container py-20 text-center">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Notifications</h1>
        <p className="mt-2 text-muted-foreground">Sign in to see your notifications.</p>
        <Button className="mt-6" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="dm-container py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Notifications</h1>
            {!loading && unreadCount > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark all as read
            </Button>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
            : notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`dm-card flex items-start gap-4 p-5 transition ${
                    !notification.read ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                >
                  <NotificationIcon type={notification.type} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium'}`}>
                      {notification.body || notification.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(notification.created_date)}
                    </p>
                  </div>
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className="dm-focus shrink-0 rounded-lg p-1 text-muted-foreground transition hover:text-foreground"
                      title="Mark as read"
                    >
                      <BellOff className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
        </div>

        {!loading && notifications.length === 0 && (
          <div className="mt-20 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 font-display text-xl font-semibold">All caught up</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You have no notifications right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
