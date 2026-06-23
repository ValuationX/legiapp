import * as React from 'react';

const STORAGE_KEY = 'billaid.settings';

export type ThemePref = 'light' | 'dark' | 'system';

export interface Settings {
  /** Show the Ukraine / foreign-affairs layer (tracker nav, profile FA section,
   *  Ukraine filters, leadership Ukraine column). Default on — it's a Nova Ukraine
   *  tool — but can be turned off to use Bill Aid as a plain bill tracker. */
  showForeignAffairs: boolean;
  /** Color theme: explicit light/dark, or follow the OS preference. */
  theme: ThemePref;
}

const DEFAULTS: Settings = { showForeignAffairs: true, theme: 'system' };

function load(): Settings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULTS;
    // Validate per-field so a corrupted/legacy stored value self-heals to the
    // default for that field instead of violating the Settings type (e.g. a
    // wedged theme that can't be cleared without wiping storage).
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      showForeignAffairs:
        typeof parsed.showForeignAffairs === 'boolean' ? parsed.showForeignAffairs : DEFAULTS.showForeignAffairs,
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : DEFAULTS.theme,
    };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsCtx extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}
const Ctx = React.createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<Settings>(() => load());

  // Apply the color theme to <html> — toggling `.dark` drives every CSS variable.
  // When set to "system", follow the OS preference live.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    if (settings.theme === 'system') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [settings.theme]);

  const set = React.useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const value = React.useMemo(() => ({ ...settings, set }), [settings, set]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
