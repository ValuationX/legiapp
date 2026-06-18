import { ShieldAlert } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/primitives';

const KEY = 'legiapp-disclaimer-accepted-v1';

/** One-time, must-accept research disclaimer (remembered in localStorage). */
export function DisclaimerModal() {
  const [accepted, setAccepted] = React.useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return true; // if storage is unavailable, don't block the app
    }
  });

  if (accepted) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setAccepted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-popover p-6 shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Before you begin</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This tool simplifies the political-lobbying research process by aggregating public legislative data. It is an{' '}
          <span className="font-medium text-foreground">informational aid only</span> and by no means a replacement for
          human judgment. Verify anything important against the official record before acting on it.
        </p>
        <Button onClick={accept} className="mt-5 w-full">
          I understand
        </Button>
      </div>
    </div>
  );
}
