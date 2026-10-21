import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/format';

const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function AdminSales() {
  const [byCity, setByCity] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      base44.entities.Listing.aggregate({
        query: { status: 'sold' },
        groupBy: 'city',
        sum: 'price',
        count: true,
        sort: '-sum_price',
        limit: 12,
      }).catch(() => ({ rows: [] })),
      base44.entities.Listing.filter({ status: 'sold' }, { sort: '-updated_date', limit: 10 }).catch(() => ({ items: [] })),
    ]).then(([cityRows, recentPage]) => {
      if (!active) return;
      setByCity(cityRows?.rows || []);
      setRecent(recentPage?.items || []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const totalSold = byCity.reduce((sum, row) => sum + (row.count || 0), 0);
  const totalVolume = byCity.reduce((sum, row) => sum + (row.sum_price || 0), 0);
  const avgPrice = totalSold ? totalVolume / totalSold : 0;
  const maxCityVolume = Math.max(...byCity.map((row) => row.sum_price || 0), 1);

  const cards = [
    { label: 'Sold listings', value: totalSold, icon: Building2 },
    { label: 'Total sale volume', value: money(totalVolume), icon: TrendingUp },
    { label: 'Average sale price', value: money(avgPrice), icon: TrendingUp },
    { label: 'Cities with sales', value: byCity.length, icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <h2 className="font-display text-lg font-semibold">Sales by city</h2>
          {byCity.length ? (
            <ul className="mt-4 space-y-3">
              {byCity.map((row) => (
                <li key={row.city || 'unknown'}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.city || 'Not recorded'}</span>
                    <span className="text-muted-foreground">
                      {row.count} sold · {money(row.sum_price)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, ((row.sum_price || 0) / maxCityVolume) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No listings have been marked as sold yet. When a listing owner or admin marks a listing
              sold, it appears here.
            </p>
          )}
        </section>

        <section className="dm-card p-6">
          <h2 className="font-display text-lg font-semibold">Recent sales</h2>
          {recent.length ? (
            <ul className="mt-4 divide-y divide-border">
              {recent.map((listing) => (
                <li key={listing.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <Link to={`/property/${listing.id}`} className="min-w-0 font-medium hover:text-primary hover:underline">
                    <span className="block truncate">{listing.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {listing.city}, {listing.state} · sold {formatRelative(listing.updated_date)}
                    </span>
                  </Link>
                  <span className="shrink-0 font-display font-semibold">{money(listing.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No completed sales to show yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}