import { Crown, FileText, Globe, Map as MapIcon, Users } from 'lucide-react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { Layout } from '@/components/Layout';
import { Logo } from '@/components/Logo';
import { StatePicker } from '@/components/StatePicker';
import { Spinner } from '@/components/ui/primitives';
import About from '@/pages/About';
import BillDetail from '@/pages/BillDetail';
import Bills from '@/pages/Bills';
import Calendar from '@/pages/Calendar';
import CommitteeDetail from '@/pages/CommitteeDetail';
import Committees from '@/pages/Committees';
import Dashboard from '@/pages/Dashboard';
import ForeignAffairs from '@/pages/ForeignAffairs';
import Leadership from '@/pages/Leadership';
import LegislatorDetail from '@/pages/LegislatorDetail';
import Legislators from '@/pages/Legislators';
import MapPage from '@/pages/Map';
import NotFound from '@/pages/NotFound';
import Privacy from '@/pages/Privacy';
import Settings from '@/pages/Settings';
import Terms from '@/pages/Terms';
import VoteDetail from '@/pages/VoteDetail';
import { AccessGate, useAccess } from '@/lib/access';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { StateProvider, useStateCtx } from '@/lib/state';

/** Welcome / main intro page: a short intro to Bill Aid + the state picker.
 *  Shown on first visit (no state chosen) and reachable anytime via the logo (/welcome). */
function StateLanding() {
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
          <StatePicker onPick={() => navigate('/')} />
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { chosen } = useStateCtx();
  if (!chosen) return <StateLanding />;
  return (
    <>
      <DisclaimerModal />
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
    </>
  );
}

export default function App() {
  const { authorized, loading } = useAccess();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  if (!authorized) return <AccessGate />;

  return (
    <SettingsProvider>
      <StateProvider>
        <Shell />
      </StateProvider>
    </SettingsProvider>
  );
}
