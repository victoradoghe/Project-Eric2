import { useCallback, useEffect, useState } from 'react';
import { Mail, ShieldCheck, ShieldQuestion, UserCog } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { setUserRole, setUserStatus } from '@/lib/adminActions';
import { formatDate } from '@/lib/format';

export default function AdminUsers() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await base44.entities.User.list({ sort: '-created_date', limit: 200 });
      setUsers(Array.isArray(result) ? result : result?.items || []);
    } catch (error) {
      toast({ title: 'Could not load accounts', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (targetUser, role) => {
    if (targetUser.id === user?.id && role !== 'admin') {
      toast({ title: 'You cannot remove your own administrator role', variant: 'destructive' });
      return;
    }
    try {
      await setUserRole(user, targetUser, role);
      toast({ title: `${targetUser.email} is now ${role === 'admin' ? 'an administrator' : 'a standard user'}` });
      load();
    } catch (error) {
      toast({ title: 'Could not change the role', description: error?.message, variant: 'destructive' });
    }
  };

  const toggleStatus = async (targetUser) => {
    const next = targetUser.account_status === 'suspended' ? 'active' : 'suspended';
    try {
      await setUserStatus(user, targetUser, next);
      toast({ title: next === 'suspended' ? 'Account suspended' : 'Account reactivated' });
      load();
    } catch (error) {
      toast({ title: 'Could not update the account', description: error?.message, variant: 'destructive' });
    }
  };

  const filtered = query
    ? users.filter((entry) =>
        `${entry.full_name || ''} ${entry.email || ''}`.toLowerCase().includes(query.toLowerCase()),
      )
    : users;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search accounts"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} account{filtered.length === 1 ? '' : 's'}
        </p>
      </div>

      <p className="rounded-2xl border border-border bg-white p-4 text-xs leading-relaxed text-muted-foreground">
        Accounts join by invitation. Administrators can change a role or suspend an account; every change is
        written to the audit log. Suspending an account does not delete its listings — archive those separately
        in the moderation queue.
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : null}

      <div className="dm-card divide-y divide-border">
        {filtered.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{entry.full_name || 'Unnamed account'}</p>
                {entry.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <ShieldCheck className="h-3 w-3" />
                    Administrator
                  </span>
                ) : null}
                {entry.account_status === 'suspended' ? (
                  <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                    Suspended
                  </span>
                ) : null}
                {entry.verification_status === 'verified' ? (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    Verified identity
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {entry.email}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Joined {formatDate(entry.created_date)}
                {entry.account_roles?.length ? ` · roles: ${entry.account_roles.join(', ')}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => changeRole(entry, entry.role === 'admin' ? 'user' : 'admin')}
              >
                <UserCog className="mr-1.5 h-3.5 w-3.5" />
                {entry.role === 'admin' ? 'Make standard user' : 'Make administrator'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleStatus(entry)}>
                {entry.account_status === 'suspended' ? (
                  <>
                    <ShieldQuestion className="mr-1.5 h-3.5 w-3.5" />
                    Reactivate
                  </>
                ) : (
                  'Suspend'
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}