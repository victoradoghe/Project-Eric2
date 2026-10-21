import { useCallback, useEffect, useState } from 'react';
import { Database, Loader2, ScrollText, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { demoListingCount, removeDemoListings, seedDemoListings } from '@/lib/seedDemo';
import { writeAudit } from '@/lib/adminActions';
import { formatDateTime } from '@/lib/format';

export default function AdminAudit() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [entries, setEntries] = useState([]);
  const [demoCount, setDemoCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [auditPage, count] = await Promise.all([
        base44.entities.AuditLog.list({ sort: '-created_date', limit: 100 }),
        demoListingCount(),
      ]);
      setEntries(Array.isArray(auditPage) ? auditPage : auditPage?.items || []);
      setDemoCount(count);
    } catch (error) {
      toast({ title: 'Could not load the audit log', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const seed = async () => {
    setWorking(true);
    try {
      const result = await seedDemoListings(user);
      await writeAudit(user, {
        action: 'demo_data.loaded',
        targetType: 'platform',
        targetLabel: 'Demonstration listings',
        details: `${result.created} sample listings created`,
      });
      toast({
        title: result.skipped ? 'Sample listings already present' : 'Sample listings loaded',
        description: result.skipped
          ? 'Sample listings are already in the marketplace.'
          : `${result.created} clearly labelled sample listings were added.`,
      });
      load();
    } catch (error) {
      toast({ title: 'Could not load sample data', description: error?.message, variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    setWorking(true);
    try {
      await removeDemoListings();
      await writeAudit(user, {
        action: 'demo_data.removed',
        targetType: 'platform',
        targetLabel: 'Demonstration listings',
        details: 'All sample listings and their properties were deleted',
      });
      toast({ title: 'Sample listings removed', description: 'Real listings were not affected.' });
      load();
    } catch (error) {
      toast({ title: 'Could not remove sample data', description: error?.message, variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="dm-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Database className="h-4 w-4 text-primary" />
          Demonstration data
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sample listings are fictional properties, always labelled “Sample” wherever they appear, and kept
          separate from listings real accounts publish. You can load them to test the marketplace and remove
          every one of them here in a single action — real listings are never touched.
        </p>
        <p className="mt-3 text-sm">
          Currently in the database: <span className="font-semibold">{demoCount ?? '—'}</span> sample listing
          {demoCount === 1 ? '' : 's'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={seed} disabled={working}>
            {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Load demonstration listings
          </Button>
          <Button variant="outline" onClick={remove} disabled={working || !demoCount}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove all demonstration listings
          </Button>
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <ScrollText className="h-4 w-4 text-primary" />
          Audit history
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Approving, rejecting, archiving, verifying, changing roles and resolving reports are all recorded with
          the acting administrator, the record and the time.
        </p>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : null}

        {!loading && !entries.length ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No administrative actions recorded yet.
          </p>
        ) : null}

        {entries.length ? (
          <div className="dm-card mt-4 divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium capitalize">{entry.action?.replace(/[._]/g, ' ')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.target_type}
                    {entry.target_label ? ` · ${entry.target_label}` : ''}
                    {entry.details ? ` · ${entry.details}` : ''}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.actor_email || 'system'} · {formatDateTime(entry.created_date)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}