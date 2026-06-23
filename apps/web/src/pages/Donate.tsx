import {
  Accessibility,
  BarChart3,
  BellRing,
  Code2,
  Database,
  Download,
  ExternalLink,
  Globe2,
  HeartHandshake,
  KeyRound,
  Map as MapIcon,
  Puzzle,
  RefreshCw,
  Rocket,
  Server,
  Sparkles,
  Target,
} from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Badge, Card, CardContent } from '@/components/ui/primitives';
import { DONATE_URL, FUNDING_GOAL, KOFI_EMBED_URL } from '@/lib/donate';
import { safeHref } from '@/lib/utils';

// Ko-fi config (KOFI_USERNAME, goal, URLs) lives in @/lib/donate — the single
// place to set the Ko-fi handle and light up the button, embed, and banners.

// What day-to-day donations keep running.
const COVERS = [
  { icon: Server, title: 'Hosting', desc: 'Web hosting and serverless API (Vercel) that keep the site online and fast.' },
  { icon: Database, title: 'Database', desc: 'The managed Postgres (Neon) that stores bills, votes, members, and calendars.' },
  { icon: RefreshCw, title: 'Fresh data', desc: 'The ongoing work of keeping legislation current across every state.' },
  { icon: Globe2, title: 'Open access', desc: 'A free, public tool — no paywall, kept as light on ads as possible.' },
];

// The roadmap, grouped into phases. Reaching the $200/month goal accelerates this —
// the free Advocacy API first, then nationwide coverage and advocacy tooling.
const ROADMAP = [
  {
    phase: 'Phase 1 · Open the API',
    status: 'Next',
    items: [
      { icon: Code2, title: 'Public, documented API', effort: 'Moderate', desc: 'Open, versioned endpoints with docs over the data we already serve — so any charity or developer can query bills, legislators, votes, and calendars.' },
      { icon: KeyRound, title: 'Free API keys for charities', effort: 'Moderate', desc: 'A generous, fair-use free tier so nonprofits and advocates can build on the data at no cost.' },
    ],
  },
  {
    phase: 'Phase 2 · Every state',
    status: 'Later',
    items: [
      { icon: MapIcon, title: 'Coverage for all 50 states', effort: 'High', desc: 'Expand from 10 states today to every state legislature — the core goal of pulling advocacy data nationwide.' },
      { icon: Download, title: 'Bulk & open data exports', effort: 'Moderate', desc: 'Downloadable datasets and snapshots so researchers and organizations can work with the data offline.' },
    ],
  },
  {
    phase: 'Phase 3 · Advocacy tooling',
    status: 'Later',
    items: [
      { icon: BellRing, title: 'Bill-movement alerts & webhooks', effort: 'Moderate', desc: 'Know the moment a tracked bill advances — email and webhook notifications for the windows that matter.' },
      { icon: Sparkles, title: 'Data analytics & AI insights', effort: 'High', desc: 'Legislative trends, sponsorship networks, plain-language bill summaries, and outcome signals.' },
    ],
  },
  {
    phase: 'Phase 4 · Platform',
    status: 'Future',
    items: [
      { icon: BarChart3, title: 'Interactive maps & visualizations', effort: 'Moderate', desc: 'District maps with demographic and election overlays, plus charts for bill status and party alignment.' },
      { icon: Accessibility, title: 'Accessibility & mobile', effort: 'Low–Moderate', desc: 'Full WCAG 2.1 / ADA accessibility and a polished experience on every screen size.' },
      { icon: Puzzle, title: 'Customization & white-label', effort: 'Moderate–High', desc: 'A modular settings panel, a plug-in API, and theming so other organizations can run their own edition.' },
    ],
  },
];

/** Tailwind classes for an effort badge, colored by level (green → blue → amber). */
function effortTone(effort: string): string {
  if (effort.startsWith('Low')) return 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-400';
  if (effort === 'Moderate') return 'bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/25 dark:text-sky-400';
  return 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-400'; // High / Moderate–High
}

/** Tailwind classes for a roadmap phase status badge. */
function statusTone(status: string): string {
  if (status === 'Next') return 'bg-primary/10 text-primary ring-1 ring-primary/25';
  if (status === 'Later') return 'bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/25 dark:text-sky-400';
  return 'bg-muted text-muted-foreground ring-1 ring-border'; // Future
}

export default function Donate() {
  const href = safeHref(DONATE_URL);
  const embed = safeHref(KOFI_EMBED_URL);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Support Bill Aid"
        subtitle="Help build a free, open advocacy API for every statehouse."
      />
      <div className="space-y-4">
        {/* Hero */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HeartHandshake className="h-7 w-7" aria-hidden />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Bill Aid is free — and built to stay that way.</h2>
              <p className="mx-auto max-w-prose text-sm leading-relaxed text-muted-foreground">
                It's an independent, public research tool built and maintained by a Nova Ukraine advocate.
                There's no paywall. A small monthly donation funds the mission below — a free advocacy API
                that any charity can build on.
              </p>
            </div>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <HeartHandshake className="h-4 w-4" aria-hidden />
                Donate on Ko-fi
                <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
              </a>
            ) : (
              <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                Donations are opening soon — please check back shortly. Thank you for your support. 🙏
              </p>
            )}
          </CardContent>
        </Card>

        {/* Funding goal + live Ko-fi widget */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="text-base font-semibold">Goal: ${FUNDING_GOAL} / month</h2>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Reaching ${FUNDING_GOAL}/month lets us dedicate consistent time to the free Advocacy API —
              the flagship goal on the roadmap below. Every dollar beyond the goal goes straight into
              development: the more support, the faster we ship it.
            </p>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                See live progress toward the goal on Ko-fi <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
            {embed ? (
              <div className="mt-4 overflow-hidden rounded-lg border bg-background">
                <iframe
                  src={embed}
                  title="Support Bill Aid on Ko-fi"
                  loading="lazy"
                  allow="payment"
                  className="h-[680px] w-full"
                  style={{ border: 0 }}
                />
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                A live progress thermometer will appear here once our Ko-fi page is live — so you can always
                see exactly how close we are to the goal.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mission */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Rocket className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-semibold">Where your support goes: a free Advocacy API</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Our priority is an open API that pulls legislative data across all states — so any charity or
                  advocate can track bills, sponsors, votes, and deadlines, and build their own tools on top, for
                  free. Donations directly accelerate that work and democratize the advocacy process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phased roadmap */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold">Roadmap</h2>
            <p className="mb-5 mt-1 text-xs text-muted-foreground">
              What your support unlocks, by phase — the API first, then nationwide coverage and tooling.
              Extra funding expedites the work and pulls these phases forward.
            </p>
            <div className="space-y-6">
              {ROADMAP.map((phase) => (
                <div key={phase.phase}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                    <h3 className="text-sm font-semibold">{phase.phase}</h3>
                    <Badge className={statusTone(phase.status)}>{phase.status}</Badge>
                  </div>
                  <ul className="ml-1 space-y-3 border-l border-border pl-4">
                    {phase.items.map((it) => {
                      const Icon = it.icon;
                      return (
                        <li key={it.title} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{it.title}</span>
                              <Badge className={effortTone(it.effort)}>{it.effort} effort</Badge>
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{it.desc}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* What your support covers */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-base font-semibold">What your support covers</h2>
            <ul className="grid gap-5 sm:grid-cols-2">
              {COVERS.map((c) => {
                const Icon = c.icon;
                return (
                  <li key={c.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-xs leading-relaxed text-muted-foreground">{c.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardContent className="space-y-2 p-6 text-xs leading-relaxed text-muted-foreground">
            <p>
              Contributions support the day-to-day operation of Bill Aid. Bill Aid is an independent project,
              not a registered charity — donations are not tax-deductible and are not a gift to Nova Ukraine.
            </p>
            <p>
              To support humanitarian aid for Ukraine directly, please consider donating to{' '}
              <a
                href="https://novaukraine.org/donate"
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline"
              >
                Nova Ukraine
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
