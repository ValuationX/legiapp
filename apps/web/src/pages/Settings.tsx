import { Monitor, Moon, Sun } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/primitives';
import { type ThemePref, useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';

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

function ThemeControl({ value, onChange }: { value: ThemePref; onChange: (v: ThemePref) => void }) {
  const opts: { v: ThemePref; label: string; icon: typeof Sun }[] = [
    { v: 'light', label: 'Light', icon: Sun },
    { v: 'dark', label: 'Dark', icon: Moon },
    { v: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-1">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.v)}
            className={cn(
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const { showForeignAffairs, theme, set } = useSettings();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Customize what Bill Aid shows." />
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Appearance</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Choose a light or dark theme, or follow your device setting.
              </p>
            </div>
            <ThemeControl value={theme} onChange={(v) => set('theme', v)} />
          </CardContent>
        </Card>

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
    </div>
  );
}
