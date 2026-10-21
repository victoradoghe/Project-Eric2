import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Flag, Inbox, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/format';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [listingStatus, setListingStatus] = useState([]);
  const [topCities, setTopCities] = useState([]);
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      base44.entities.Listing.aggregate({ groupBy: 'status' }).catch(() => ({ rows: [] })),
      base44.entities.Property.count().catch(() => 0),
      base44.entities.User.list({ limit: 100 }).catch(() => []),
      base44.entities.Report.count({ status: 'open' }).catch(() => 0),
      base44.entities.ContactMessage.count({ status: 'new' }).catch(() => 0),
      base44.entities.AgentProfile.count({ verification_status: 'pending' }).catch(() => 0),
    ]).then(([statusRows, properties, users, reports, messages, verifications]) => {
      if (!active) return;
      const rows = statusRows?.rows || [];
      setListingStatus(rows);
      setStats({
        properties,
        listings: rows.reduce((sum, row) => sum + (row.count || 0), 0),
        users: Array.isArray(users) ? users.length : users?.items?.length || 0,
        reports,
        messages,
        verifications,
      });
    });

    base44.entities.Listing.aggregate({ groupBy: 'city', sum: 'views', sort: '-count', limit: 8 })
      .then((result) => {
        if (active) setTopCities(result?.rows || []);
      })
      .catch(() => setTopCities([]));

    base44.entities.AuditLog.list({ sort: '-created_date', limit: 8 })
      .then((result) => {
        const items = Array.isArray(result) ? result : result?.items || [];
        if (active) setAudit(items);
      })
      .catch(() => setAudit([]));

    return () => {
      active = false;
    };
  }, []);

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Listings', value: stats.listings, icon: Building2 },
    { label: 'Properties', value: stats.properties, icon: Building2 },
    { label: 'Accounts', value: stats.users, icon: Users },
    { label: 'Open reports', value: stats.reports, icon: Flag },
    { label: 'New contact messages', value: stats.messages, icon: Inbox },
    { label: 'Verifications waiting', value: stats.verifications, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="dm-card p-5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
              <card.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="dm-card p-6">
          <h2 className="font-display text-lg font-semibold">Listings by status</h2>
          {listingStatus.length ? (
            <ul className="mt-4 space-y-2">
              {listingStatus.map((row) => (
                <li key={row.status} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                  <span className="capitalize">{String(row.status || '').replace(/_/g, ' ')}</span>
                  <span className="font-semibold">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No listings yet.</p>
          )}
        </section>

        <section className="dm-card p-6">
          <h2 className="font-display text-lg font-semibold">Most listed cities</h2>
          {topCities.length ? (
            <ul className="mt-4 space-y-2">
              {topCities.map((row) => (
                <li key={row.city || 'unknown'} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                  <span>{row.city || 'Not recorded'}</span>
                  <span className="text-muted-foreground">
                    {row.count} listing{row.count === 1 ? '' : 's'} · {row.sum_views || 0} views
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No listing activity yet.</p>
          )}
        </section>
      </div>

      <section className="dm-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Recent administrative actions</h2>
          <Link to="/admin" className="text-sm font-semibold text-primary hover:underline">
            Full history
          </Link>
        </div>
        {audit.length ? (
          <ul className="mt-4 divide-y divide-border">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <span className="font-medium capitalize">{entry.action?.replace(/[._]/g, ' ')}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    — {entry.target_label || entry.target_type}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.actor_email || 'system'} · {formatRelative(entry.created_date)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No administrative actions recorded yet. Approving, rejecting and verifying records are logged here
            automatically.
          </p>
        )}
      </section>
    </div>
  );
}