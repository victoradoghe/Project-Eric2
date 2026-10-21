import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Flag, LayoutDashboard, MessageSquare, ScrollText, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminOverview from '@/components/admin/AdminOverview';
import ModerationQueue from '@/components/admin/ModerationQueue';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminReports from '@/components/admin/AdminReports';
import AdminAudit from '@/components/admin/AdminAudit';
import AdminSales from '@/components/admin/AdminSales';
import AdminMessages from '@/components/admin/AdminMessages';

export default function Admin() {
  const { user, isLoadingAuth } = useAuth() || {};
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth) setReady(true);
  }, [isLoadingAuth]);

  if (ready && user && user.role !== 'admin') {
    return (
      <div className="dm-container py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <h1 className="mt-4 font-display text-xl font-semibold">Administration only</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This area is limited to administrators. Access is checked on the server for every record, so it is
            not simply hidden from view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Moderation, accounts, reports, verification and the record of what has been done.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Building2 className="mr-1.5 h-4 w-4" />
            Listing moderation
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1.5 h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Flag className="mr-1.5 h-4 w-4" />
            Reports & verification
          </TabsTrigger>
          <TabsTrigger value="sales">
            <TrendingUp className="mr-1.5 h-4 w-4" />
            Sales data
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Client messages
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ScrollText className="mr-1.5 h-4 w-4" />
            Audit & sample data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminOverview />
        </TabsContent>
        <TabsContent value="queue" className="mt-6">
          <ModerationQueue />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <AdminUsers />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <AdminReports />
        </TabsContent>
        <TabsContent value="sales" className="mt-6">
          <AdminSales />
        </TabsContent>
        <TabsContent value="messages" className="mt-6">
          <AdminMessages />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AdminAudit />
        </TabsContent>
      </Tabs>

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-white p-4 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Platform settings you manage outside the app: app visibility, custom domains, email templates, analytics,
        integrations, logs and the security scan — each has its own page in the app dashboard.
      </p>
    </div>
  );
}