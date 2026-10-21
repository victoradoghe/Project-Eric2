import { NavLink, Outlet, Link } from 'react-router-dom';
import { Bell, Building2, Heart, Home, Inbox, LayoutDashboard, MessageSquare, Plus, ShieldCheck, User, FileText } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import BrandLogo from '@/components/BrandLogo';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/listings', label: 'My listings', icon: Building2 },
  { to: '/dashboard/leads', label: 'Enquiries & viewings', icon: Inbox },
  { to: '/dashboard/applications', label: 'Applications', icon: FileText },
  { to: '/dashboard/requests', label: 'My requests', icon: Home },
  { to: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { to: '/favorites', label: 'Saved homes', icon: Heart },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile & agent page', icon: User },
];

export default function DashboardLayout() {
  const { user } = useAuth() || {};
  const items = [...NAV_ITEMS];
  if (user?.role === 'admin') {
    items.push({ to: '/admin', label: 'Administration', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-white">
        <div className="dm-container flex h-16 items-center justify-between gap-4">
          <BrandLogo />
          <Link
            to="/dashboard/listings/new"
            className="dm-focus inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New listing
          </Link>
        </div>
      </header>

      <div className="dm-container flex flex-col gap-8 py-8 lg:flex-row">
        <nav aria-label="Dashboard" className="lg:w-64 lg:shrink-0">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-8 lg:flex-col lg:overflow-visible">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'dm-focus flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/75 hover:bg-white hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/"
              className="dm-focus flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-white hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Back to site
            </Link>
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}