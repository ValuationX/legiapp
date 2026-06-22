import { Route, Routes } from 'react-router-dom';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { Layout } from '@/components/Layout';
import { Logo } from '@/components/Logo';
import { StatePicker } from '@/components/StatePicker';
import { Spinner } from '@/components/ui/primitives';
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
import Settings from '@/pages/Settings';
import VoteDetail from '@/pages/VoteDetail';
import { AccessGate, useAccess } from '@/lib/access';
import { SettingsProvider } from '@/lib/settings';
import { StateProvider, useStateCtx } from '@/lib/state';

function StateLanding() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <Logo size={40} />
        <p className="text-sm text-muted-foreground">Choose a state to explore its legislature.</p>
      </div>
      <StatePicker />
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
