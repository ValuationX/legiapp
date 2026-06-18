import { Route, Routes } from 'react-router-dom';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui/primitives';
import BillDetail from '@/pages/BillDetail';
import Bills from '@/pages/Bills';
import Calendar from '@/pages/Calendar';
import CommitteeDetail from '@/pages/CommitteeDetail';
import Committees from '@/pages/Committees';
import Dashboard from '@/pages/Dashboard';
import ForeignAffairs from '@/pages/ForeignAffairs';
import LegislatorDetail from '@/pages/LegislatorDetail';
import Legislators from '@/pages/Legislators';
import MapPage from '@/pages/Map';
import NotFound from '@/pages/NotFound';
import VoteDetail from '@/pages/VoteDetail';
import { AccessGate, useAccess } from '@/lib/access';
import { StateProvider } from '@/lib/state';

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
    <StateProvider>
      <DisclaimerModal />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/legislators" element={<Legislators />} />
          <Route path="/legislators/:id" element={<LegislatorDetail />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/:id" element={<BillDetail />} />
          <Route path="/committees" element={<Committees />} />
          <Route path="/committees/:id" element={<CommitteeDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/foreign-affairs" element={<ForeignAffairs />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/votes/:id" element={<VoteDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </StateProvider>
  );
}
