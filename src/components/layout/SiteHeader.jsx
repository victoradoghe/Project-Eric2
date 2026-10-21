import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Heart, LogOut, LayoutDashboard, Menu, Plus, ShieldCheck, User, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import BrandLogo from '@/components/BrandLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initialsOf } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/search?listing_type=sale', label: 'Buy' },
  { to: '/rent', label: 'Rent' },
  { to: '/sell', label: 'Sell' },
  { to: '/agents', label: 'Agents' },
];

const linkClass = ({ isActive }) =>
  cn(
    'dm-focus rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive ? 'text-primary' : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
  );

export default function SiteHeader() {
  const auth = useAuth() || {};
  const user = auth.user;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    setOpen(false);
    if (typeof auth.logout === 'function') {
      await auth.logout();
    } else {
      await base44.auth.logout();
    }
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="dm-container flex h-16 items-center gap-3 sm:h-[4.5rem]">
        <BrandLogo />

        <nav className="ml-4 hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/favorites"
            aria-label="Saved homes"
            className="dm-focus hidden h-10 w-10 place-items-center rounded-xl text-foreground/70 transition hover:bg-secondary hover:text-primary sm:grid"
          >
            <Heart className="h-5 w-5" />
          </Link>

          {user ? (
            <>
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="dm-focus grid h-10 w-10 place-items-center rounded-xl text-foreground/70 transition hover:bg-secondary hover:text-primary"
              >
                <Bell className="h-5 w-5" />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="dm-focus rounded-full border border-border p-0.5 transition hover:border-primary/40"
                  >
                    <Avatar className="h-8 w-8">
                      {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                        {initialsOf(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {user.full_name || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/favorites')}>
                    <Heart className="mr-2 h-4 w-4" /> Saved homes
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  {user.role === 'admin' ? (
                    <DropdownMenuItem onSelect={() => navigate('/admin')}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Administration
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              to="/login"
              className="dm-focus rounded-xl px-3 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-secondary hover:text-foreground"
            >
              Sign in
            </Link>
          )}

          <Link
            to="/dashboard/listings/new"
            className="dm-focus hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            List your home
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="dm-focus grid h-10 w-10 place-items-center rounded-xl text-foreground/80 transition hover:bg-secondary lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-white lg:hidden">
          <nav className="dm-container flex flex-col py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="dm-focus rounded-xl px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-secondary"
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/favorites"
              onClick={() => setOpen(false)}
              className="dm-focus rounded-xl px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-secondary"
            >
              Saved homes
            </Link>
            <Link
              to="/dashboard/listings/new"
              onClick={() => setOpen(false)}
              className="dm-focus mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              List your home
            </Link>
            {!user ? (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="dm-focus mt-2 rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold"
              >
                Sign in
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}