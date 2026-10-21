import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, MapPin, Phone, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function Agencies() {
  const [agencies, setAgencies] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.Agency.filter({}, { sort: '-created_date', limit: 48 })
      .then((page) => {
        if (active) setAgencies(page?.items || []);
      })
      .catch(() => {
        if (active) setAgencies([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    base44.entities.Listing.aggregate({ groupBy: 'agency_name', sum: 'views' })
      .then((result) => {
        const map = {};
        (result?.rows || []).forEach((row) => {
          if (row.agency_name) map[row.agency_name] = row.count;
        });
        if (active) setCounts(map);
      })
      .catch(() => setCounts({}));

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dm-container py-10">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">Agencies on Dwellmark</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Agencies are created by their own members. Verification is only shown once an administrator has
          confirmed the agency's details.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {!loading && !agencies.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
          <Building2 className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 font-semibold">No agencies yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Agencies appear here once a member creates one from their account settings.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/agents">Browse individual agents</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {agencies.map((agency) => (
          <article key={agency.id} className="dm-card flex flex-col gap-3 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold">{agency.name}</p>
                {agency.city ? (
                  <p className="text-xs text-muted-foreground">
                    {[agency.city, agency.state].filter(Boolean).join(', ')}
                  </p>
                ) : null}
              </div>
            </div>

            {agency.about ? (
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{agency.about}</p>
            ) : null}

            <div className="mt-auto space-y-1.5 text-xs text-muted-foreground">
              {counts[agency.name] !== undefined ? (
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {counts[agency.name]} listing{counts[agency.name] === 1 ? '' : 's'} on Dwellmark
                </p>
              ) : null}
              {agency.phone ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {agency.phone}
                </p>
              ) : null}
              {agency.email ? (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {agency.email}
                </p>
              ) : null}
              {agency.city ? (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {[agency.city, agency.state].filter(Boolean).join(', ')}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  agency.verification_status === 'verified'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {agency.verification_status === 'verified' ? 'Verified' : 'Not verified'}
              </span>
              {agency.is_demo ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  Sample agency
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}