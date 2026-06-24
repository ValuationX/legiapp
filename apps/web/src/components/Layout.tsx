import {
  Building2,
  CalendarDays,
  ChevronDown,
  Crown,
  FileText,
  Globe,
  Heart,
  LayoutDashboard,
  Map,
  MapPin,
  Menu,
  MessageSquarePlus,
  Moon,
  Search,
  Settings as SettingsIcon,
  Sun,
  Users,
  X,
} from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FeedbackButton } from '@/components/FeedbackButton';
import { Logo, LogoMark } from '@/components/Logo';
import { StatePicker } from '@/components/StatePicker';
import { useSettings } from '@/lib/settings';
import { useStateCtx } from '@/lib/state';
import { cn } from '@/lib/utils';

// Lazy so cmdk only loads when the palette is first opened (keeps it out of the entry bundle).
const SearchPalette = React.lazy(() =>
  import('@/components/SearchPalette').then((m) => ({ default: m.SearchPalette })),
);

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
          'transition-[transform,margin] duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:self-start',
          open ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-64',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
          <Link to="/welcome" className="hover:opacity-80" aria-label="Bill Aid — home">
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

        <div className="space-y-1 border-t p-3">
          <NavLink to="/donate" className={navLinkClass}>
            <Heart className="h-4 w-4 shrink-0 text-primary" />
            Donate
          </NavLink>
          <FeedbackButton className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            Feedback
          </FeedbackButton>
          <NavLink to="/settings" className={navLinkClass}>
            <SettingsIcon className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}

function StateSwitcher() {
  const { state, current, states } = useStateCtx();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const label = current?.name ?? state;
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent/40"
        aria-label="Change state"
      >
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open
        ? createPortal(
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
            <StatePicker
              onPick={() => {
                setOpen(false);
                navigate('/'); // switching states drops you on the new state's This Week (not a stale cross-state detail page)
              }}
            />
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ThemeToggle() {
  const { theme, set } = useSettings();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <button
      onClick={() => set('theme', isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent/40 hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t bg-card/30">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex items-center gap-2">
          <LogoMark size={18} />
          <span>© {year} Bill Aid — informational research aid; verify against the official record.</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/donate" className="font-medium text-primary transition-colors hover:underline">
            Donate
          </Link>
          <FeedbackButton className="transition-colors hover:text-foreground">Feedback</FeedbackButton>
          <Link to="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
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
        className="flex h-9 w-full min-w-0 max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent/40"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search members, bills, committees…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <StateSwitcher />
      </div>
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
        <Footer />
      </div>
      {searchOpen ? (
        <React.Suspense fallback={null}>
          <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </React.Suspense>
      ) : null}
    </div>
  );
}
