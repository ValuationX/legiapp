import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/primitives';
import { useSettings } from '@/lib/settings';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { showForeignAffairs, set } = useSettings();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Customize what Bill Aid shows." />
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Ukraine &amp; foreign-affairs tracking</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Shows the Foreign Affairs tracker, each member's Ukraine bill record, the Ukraine columns and
                filters, and the leadership record. Turn off to use Bill Aid as a general-purpose bill tracker.
              </p>
            </div>
            <Toggle
              checked={showForeignAffairs}
              onChange={(v) => set('showForeignAffairs', v)}
              label="Toggle Ukraine and foreign-affairs tracking"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
