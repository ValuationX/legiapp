import { useStateCtx } from '@/lib/state';
import { cn } from '@/lib/utils';

// Standard square tile-grid map: [code, row, col] over an 11-col × 8-row grid,
// laid out roughly geographically (NW top-left → SE bottom-right). All 50 + DC.
const GRID: [string, number, number][] = [
  ['AK', 1, 1], ['ME', 1, 11],
  ['WI', 2, 7], ['VT', 2, 10], ['NH', 2, 11],
  ['WA', 3, 1], ['ID', 3, 2], ['MT', 3, 3], ['ND', 3, 4], ['MN', 3, 5], ['IL', 3, 6], ['MI', 3, 7], ['NY', 3, 9], ['MA', 3, 10],
  ['OR', 4, 1], ['NV', 4, 2], ['WY', 4, 3], ['SD', 4, 4], ['IA', 4, 5], ['IN', 4, 6], ['OH', 4, 7], ['PA', 4, 8], ['NJ', 4, 9], ['CT', 4, 10], ['RI', 4, 11],
  ['CA', 5, 1], ['UT', 5, 2], ['CO', 5, 3], ['NE', 5, 4], ['MO', 5, 5], ['KY', 5, 6], ['WV', 5, 7], ['VA', 5, 8], ['MD', 5, 9], ['DE', 5, 10],
  ['AZ', 6, 2], ['NM', 6, 3], ['KS', 6, 4], ['AR', 6, 5], ['TN', 6, 6], ['NC', 6, 7], ['SC', 6, 8], ['DC', 6, 9],
  ['OK', 7, 4], ['LA', 7, 5], ['MS', 7, 6], ['AL', 7, 7], ['GA', 7, 8],
  ['HI', 8, 1], ['TX', 8, 4], ['FL', 8, 9],
];

/** Clickable US tile-grid for choosing a state. Available states (data loaded) are
 *  highlighted + clickable; the rest are greyed "coming soon". `onPick` fires after
 *  a successful selection (e.g. to close a modal). */
export function StatePicker({ onPick }: { onPick?: () => void }) {
  const { state, setState, states } = useStateCtx();
  const available = new Set(states.map((s) => s.code));

  return (
    <div>
      <div className="mx-auto grid w-full max-w-xl gap-1.5" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))' }}>
        {GRID.map(([code, row, col]) => {
          const on = available.has(code);
          const current = state === code && on;
          return (
            <button
              key={code}
              type="button"
              disabled={!on}
              onClick={on ? () => { setState(code); onPick?.(); } : undefined}
              style={{ gridColumn: col, gridRow: row, aspectRatio: '1 / 1' }}
              title={on ? code : `${code} — coming soon`}
              aria-label={on ? `View ${code}` : `${code} — coming soon`}
              className={cn(
                'flex items-center justify-center rounded-md text-[11px] font-semibold transition-colors',
                on
                  ? 'cursor-pointer bg-[#185FA5] text-white hover:bg-[#0C447C]'
                  : 'cursor-not-allowed bg-muted text-muted-foreground/40',
                current && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
              )}
            >
              {code}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#185FA5]" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-muted" /> Coming soon
        </span>
      </div>
    </div>
  );
}
