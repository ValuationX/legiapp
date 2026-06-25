import { AlertTriangle, Monitor, Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { PageHeader } from '@/components/common';
import { Button, Card, CardContent } from '@/components/ui/primitives';
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

function ConfirmOverlay({
  title,
  body,
  cancelLabel,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-xl border bg-popover p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-rep-fg">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className={danger ? 'bg-rep text-white hover:bg-rep/90' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { experimentalFeatures, theme, set } = useSettings();
  // 0 = idle, 1 = explain, 2 = are-you-sure. Two confirms required to enable.
  const [confirmStep, setConfirmStep] = React.useState<0 | 1 | 2>(0);

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

        <Card className="border-rep/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-rep-fg">
                  <AlertTriangle className="h-4 w-4" /> Experimental features
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Unlocks <span className="font-medium text-foreground">Leadership</span> and the{' '}
                  <span className="font-medium text-foreground">Foreign Affairs</span> tracker.{' '}
                  <span className="font-medium text-rep-fg">
                    This data is curated and may be unreliable or out of date — please verify against the official
                    record before relying on it.
                  </span>
                </p>
              </div>
              <Toggle
                checked={experimentalFeatures}
                onChange={(v) => (v ? setConfirmStep(1) : set('experimentalFeatures', false))}
                label="Toggle experimental features"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {confirmStep === 1 ? (
        <ConfirmOverlay
          title="Enable experimental features?"
          body="Leadership and Foreign Affairs are built from curated data that may be incomplete, outdated, or unverified. Always confirm anything important against the official legislative record before relying on it."
          cancelLabel="Cancel"
          confirmLabel="I understand — continue"
          onCancel={() => setConfirmStep(0)}
          onConfirm={() => setConfirmStep(2)}
        />
      ) : null}
      {confirmStep === 2 ? (
        <ConfirmOverlay
          title="Are you sure?"
          body="You're turning on features whose data may be unreliable. By enabling them you accept that the information shown is not guaranteed accurate and must be independently verified."
          cancelLabel="Cancel"
          confirmLabel="Enable experimental features"
          danger
          onCancel={() => setConfirmStep(0)}
          onConfirm={() => {
            set('experimentalFeatures', true);
            setConfirmStep(0);
          }}
        />
      ) : null}
    </div>
  );
}
