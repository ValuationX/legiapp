import * as React from 'react';
import { LogoMark } from '@/components/Logo';
import { Button, Card, CardContent, Input } from '@/components/ui/primitives';
import { api } from './api';

interface AccessCtx {
  authorized: boolean;
  loading: boolean;
  submit: (code: string) => Promise<boolean>;
}

const Ctx = React.createContext<AccessCtx | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.access
      .status()
      .then((r) => setAuthorized(r.authorized))
      .catch(() => setAuthorized(false))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (code: string) => {
    const ok = await api.access.submit(code);
    if (ok) setAuthorized(true);
    return ok;
  };

  return <Ctx.Provider value={{ authorized, loading, submit }}>{children}</Ctx.Provider>;
}

export function useAccess(): AccessCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('useAccess must be used within AccessProvider');
  return c;
}

/** Full-screen gate shown until the shared access code is entered. */
export function AccessGate() {
  const { submit } = useAccess();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const ok = await submit(code.trim());
      if (!ok) setError('That access code is not valid.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={48} />
          <h1 className="mt-3 text-xl font-semibold tracking-tight">Bill Aid</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter the access code shared by your organization.</p>
        </div>
        <Card>
          <CardContent className="p-5">
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                type="password"
                autoFocus
                placeholder="Access code"
                aria-label="Access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {error ? (
                <p className="rounded-md border border-nay/30 bg-nay/5 px-3 py-2 text-sm text-nay" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
                {busy ? 'Checking…' : 'Enter'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          An informational research aid — it does not replace human judgment.
        </p>
      </div>
    </div>
  );
}
