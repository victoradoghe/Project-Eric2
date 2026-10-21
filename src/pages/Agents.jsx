import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Search, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const filter = applied
      ? {
          $or: [
            { display_name: { $regex: escapeRegex(applied), $options: 'i' } },
            { service_areas: { $regex: escapeRegex(applied), $options: 'i' } },
            { specialties: { $regex: escapeRegex(applied), $options: 'i' } },
            { city: { $regex: escapeRegex(applied), $options: 'i' } },
          ],
        }
      : {};

    base44.entities.AgentProfile.filter(filter, { sort: '-created_date', limit: 48 })
      .then((page) => {
        if (active) setAgents(page?.items || []);
      })
      .catch(() => {
        if (active) setAgents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    base44.entities.Review.aggregate({ groupBy: 'agent_profile_id', avg: 'rating' })
      .then((result) => {
        const map = {};
        (result?.rows || []).forEach((row) => {
          map[row.agent_profile_id] = { avg: row.avg_rating, count: row.count };
        });
        if (active) setStats(map);
      })
      .catch(() => setStats({}));

    return () => {
      active = false;
    };
  }, [applied]);

  const listingCounts = useMemo(() => stats, [stats]);

  return (
    <div className="dm-container py-10">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">Find an agent</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Agents publish their own profiles here. Credentials are only marked as verified after an
          administrator has reviewed them — anything else is shown as unverified information supplied by the
          agent.
        </p>
      </div>

      <form
        className="mt-6 flex max-w-xl items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(query.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, city, specialty or service area"
            aria-label="Search agents"
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {!loading && !agents.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
          <p className="font-semibold">No agent profiles match that search</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Agents appear here once they publish a profile from their account settings.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const rating = listingCounts[agent.id];
          return (
            <Link
              key={agent.id}
              to={`/agents/${agent.id}`}
              className="dm-card dm-card-hover dm-focus flex flex-col gap-3 p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 overflow-hidden rounded-2xl bg-secondary">
                  {agent.photo_url ? (
                    <img src={agent.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center font-display text-lg text-muted-foreground">
                      {(agent.display_name || '?').slice(0, 1)}
                    </span>
                  )}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    agent.verification_status === 'verified'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {agent.verification_status === 'verified' ? (
                    <>
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </>
                  ) : (
                    'Unverified'
                  )}
                </span>
              </div>

              <div>
                <p className="font-display text-lg font-semibold">{agent.display_name}</p>
                <p className="text-sm text-muted-foreground">{agent.agency_name || 'Independent agent'}</p>
              </div>

              {rating?.count ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(rating.avg).toFixed(1)} from {rating.count} review{rating.count === 1 ? '' : 's'}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              )}

              {agent.service_areas?.length ? (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{agent.service_areas.join(', ')}</span>
                </p>
              ) : null}

              {agent.specialties?.length ? (
                <p className="line-clamp-1 text-xs text-muted-foreground">{agent.specialties.join(' · ')}</p>
              ) : null}

              {agent.is_demo ? (
                <span className="mt-auto w-fit rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sample profile
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}