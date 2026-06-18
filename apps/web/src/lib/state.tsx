import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { api, getStateCode, setActiveState, type StateMeta } from '@/lib/api';

const STORAGE_KEY = 'legiapp.state';

interface StateCtx {
  /** Active 2-letter state code (e.g. 'CA'). */
  state: string;
  /** Switch states — persists the choice and refetches all scoped data. */
  setState: (code: string) => void;
  /** States with data loaded (drives the selector); always includes CA. */
  states: StateMeta[];
  /** Display config for the active state, once the registry has loaded. */
  current: StateMeta | undefined;
}

const Ctx = React.createContext<StateCtx | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [state, setStateRaw] = React.useState<string>(() => getStateCode());
  const [states, setStates] = React.useState<StateMeta[]>([]);

  // Load the registry once (the access cookie is already set by the time this
  // provider mounts, since it lives inside the authorized branch).
  React.useEffect(() => {
    api.meta
      .states()
      .then((list) => {
        setStates(list);
        // If the persisted state is no longer available, fall back to CA / first.
        if (list.length && !list.some((s) => s.code === getStateCode())) {
          const fallback = list.find((s) => s.code === 'CA')?.code ?? list[0].code;
          setActiveState(fallback);
          setStateRaw(fallback);
          try {
            localStorage.setItem(STORAGE_KEY, fallback);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => setStates([]));
  }, []);

  const setState = React.useCallback(
    (code: string) => {
      if (code === getStateCode()) return;
      setActiveState(code);
      setStateRaw(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* ignore */
      }
      // api.ts reads the active state at fetch time, so invalidating refetches
      // every active query under the newly selected state.
      qc.invalidateQueries();
    },
    [qc],
  );

  const current = states.find((s) => s.code === state);
  const value = React.useMemo(() => ({ state, setState, states, current }), [state, setState, states, current]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStateCtx(): StateCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useStateCtx must be used within StateProvider');
  return ctx;
}

/** Display labels for the active state, with CA fallbacks (so copy never reads
 * "undefined" before the registry loads). Drives state-aware page headers/maps. */
export function useStateLabels() {
  const { current } = useStateCtx();
  return {
    name: current?.name ?? 'California',
    lowerLabel: current?.lowerLabel ?? 'Assembly',
    upperLabel: current?.upperLabel ?? 'Senate',
    lowerShort: current?.lowerShort ?? 'AD',
    upperShort: current?.upperShort ?? 'SD',
    seatTotal: (current?.lowerSeats ?? 80) + (current?.upperSeats ?? 40),
    mapCenter: current?.mapCenter ?? ([37.3, -119.4] as [number, number]),
    mapZoom: current?.mapZoom ?? 6,
  };
}
