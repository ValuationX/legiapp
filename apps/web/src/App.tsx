import { lazy, Suspense } from 'react';
import { Crown, FileText, Globe, Map as MapIcon, Users } from 'lucide-react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { Layout } from '@/components/Layout';
import { Logo } from '@/components/Logo';
import { StatePicker } from '@/components/StatePicker';
import { Spinner } from '@/components/ui/primitives';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { StateProvider, useStateCtx } from '@/lib/state';

// Pages are code-split: each becomes its own chunk loaded on demand, so the
// initial bundle no longer carries every route (notably Map's leaflet + turf).
const About = lazy(() => import('@/pages/About'));
const BillDetail = lazy(() => import('@/pages/BillDetail'));
const Bills = lazy(() => import('@/pages/Bills'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const CommitteeDetail = lazy(() => import('@/pages/CommitteeDetail'));
const Committees = lazy(() => import('@/pages/Committees'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ForeignAffairs = lazy(() => import('@/pages/ForeignAffairs'));
const Leadership = lazy(() => import('@/pages/Leadership'));
const LegislatorDetail = lazy(() => import('@/pages/LegislatorDetail'));
const Legislators = lazy(() => import('@/pages/Legislators'));
const MapPage = lazy(() => import('@/pages/Map'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Settings = lazy(() => import('@/pages/Settings'));
const Terms = lazy(() => import('@/pages/Terms'));
const VoteDetail = lazy(() => import('@/pages/VoteDetail'));

/** Centered fallback shown while a route chunk is being fetched. */
function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

/** Welcome / main intro page: a short intro to Bill Aid + the state picker.
 *  Shown on first visit (no state chosen) and reachable anytime via the logo (/welcome). */
function StateLanding({ redirectTo = '/' }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const { showForeignAffairs } = useSettings();
  const features = [
    { icon: FileText, label: 'Bills', desc: 'Search & track legislation' },
    { icon: Users, label: 'Legislators', desc: 'Votes & sponsorships' },
    { icon: Crown, label: 'Leadership', desc: 'Who holds the gavel' },
    showForeignAffairs
      ? { icon: Globe, label: 'Foreign Affairs', desc: 'Ukraine & global measures' }
      : { icon: MapIcon, label: 'District Map', desc: 'Find your reps' },
  ];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo size={44} />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Track your statehouse, clearly.</h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Bill Aid brings bills, legislators, committees, and leadership into one fast, searchable
            place — built from official public records. Pick a state to begin.
          </p>
        </div>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1.5 rounded-lg border bg-card px-3 py-4 text-center"
              >
                <Icon className="h-5 w-5 text-[#185FA5]" />
                <div className="text-sm font-medium leading-none">{f.label}</div>
                <div className="text-[11px] leading-tight text-muted-foreground">{f.desc}</div>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="mb-4 text-center text-sm font-medium">Choose a state to begin</p>
          <StatePicker onPick={() => navigate(redirectTo)} />
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { chosen } = useStateCtx();
  const location = useLocation();
  if (!chosen) {
    // Preserve a first-time deep link (/bills/123, shared /foreign-affairs?region=…):
    // after a state is chosen, land on the originally-requested URL instead of '/'.
    const dest = location.pathname === '/welcome' ? '/' : location.pathname + location.search;
    return <StateLanding redirectTo={dest} />;
  }
  return (
    <>
      <DisclaimerModal />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/welcome" element={<StateLanding />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/legislators" element={<Legislators />} />
          <Route path="/legislators/:id" element={<LegislatorDetail />} />
          <Route path="/leadership" element={<Leadership />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/:id" element={<BillDetail />} />
          <Route path="/committees" element={<Committees />} />
          <Route path="/committees/:id" element={<CommitteeDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/foreign-affairs" element={<ForeignAffairs />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/votes/:id" element={<VoteDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  // Public site — no access gate (the data is public record; ads require open access).
  return (
    <SettingsProvider>
      <StateProvider>
        <Shell />
      </StateProvider>
    </SettingsProvider>
  );
}
