import {
  Building2,
  CalendarDays,
  ChevronDown,
  Crown,
  FileText,
  Globe,
  LayoutDashboard,
  Map,
  MapPin,
  Menu,
  Search,
  Settings as SettingsIcon,
  Users,
  X,
} from 'lucide-react';
import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SearchPalette } from '@/components/SearchPalette';
import { StatePicker } from '@/components/StatePicker';
import { useSettings } from '@/lib/settings';
import { useStateCtx } from '@/lib/state';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'This Week', icon: LayoutDashboard, end: true },
  { to: '/foreign-affairs', label: 'Foreign Affairs', icon: Globe, fa: true },
  { to: '/bills', label: 'Bills', icon: FileText },
  { to: '/legislators', label: 'Legislators', icon: Users },
  { to: '/leadership', label: 'Leadership', icon: Crown },
  { to: '/committees', label: 'Committees', icon: Building2 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/map', label: 'District Map', icon: Map },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  );

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showForeignAffairs } = useSettings();
  const items = NAV.filter((n) => !n.fa || showForeignAffairs);
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r bg-card',
          'transition-[transform,margin] duration-200 ease-in-out md:static',
          open ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-64',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
          <Link to="/" className="hover:opacity-80">
            <Logo size={30} />
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <NavLink to="/settings" className={navLinkClass}>
            <SettingsIcon className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>
          <p className="px-3 pt-3 text-[11px] leading-relaxed text-muted-foreground">
            Aggregates public legislative data — verify anything important against the official record.
          </p>
        </div>
      </aside>
    </>
  );
}

function StateSwitcher() {
  const { state, current, states } = useStateCtx();
  const [open, setOpen] = React.useState(false);
  const label = current?.name ?? state;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-auto flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent/40"
        aria-label="Change state"
      >
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Choose a state</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {states.length} state{states.length === 1 ? '' : 's'} available — more coming soon.
            </p>
            <StatePicker onPick={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function Topbar({ onSearch, onToggleNav }: { onSearch: () => void; onToggleNav: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-6">
      <button
        onClick={onToggleNav}
        aria-label="Toggle navigation"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        onClick={onSearch}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent/40"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search members, bills, committees…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <StateSwitcher />
    </header>
  );
}

export function Layout() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  const location = useLocation();

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setNavOpen(false);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onSearch={() => setSearchOpen(true)} onToggleNav={() => setNavOpen((v) => !v)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
