import * as React from 'react';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/primitives';

const UPDATED = 'June 23, 2026';

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Privacy Policy" subtitle={`Last updated ${UPDATED}`} />
      <Card>
        <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Bill Aid is a free, public, informational research tool. We don't ask you to create an account or sign in,
            and we collect as little about you as possible. This policy explains what is collected — including by the
            third parties that serve our ads and metrics.
          </p>

          <Sec title="What we store on your device">
            <p>
              Your preferences (theme, selected state, and whether the foreign-affairs layer is shown) are saved only
              in your browser's local storage. They stay on your device and are never sent to us. We don't operate
              user accounts.
            </p>
          </Sec>

          <Sec title="Advertising — Google AdSense">
            <p>
              We display ads through <span className="font-medium text-foreground">Google AdSense</span>. Google and
              its advertising partners may use cookies and similar identifiers to serve and personalize ads, limit how
              often you see an ad, and measure ad performance — which can involve your IP address and interaction data.
              You can review and control ad personalization in your{' '}
              <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                Google Ad Settings
              </a>
              , and learn more in{' '}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                Google's advertising policies
              </a>
              . In the EEA/UK, where required, personalized ads are shown only with consent.
            </p>
          </Sec>

          <Sec title="Analytics & performance — Vercel">
            <p>
              We use <span className="font-medium text-foreground">Vercel Web Analytics</span> and{' '}
              <span className="font-medium text-foreground">Speed Insights</span> to understand aggregate usage (page
              views, referrers, device type) and page performance. These are privacy-friendly: Vercel Web Analytics
              does not use cookies to track you across sites, and the data is aggregated rather than tied to your
              identity. See{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                Vercel's privacy policy
              </a>
              .
            </p>
          </Sec>

          <Sec title="Service providers">
            <p>
              The app is hosted on <span className="font-medium text-foreground">Vercel</span> and stores its data in a{' '}
              <span className="font-medium text-foreground">Neon</span> (PostgreSQL) database; interactive maps load
              tiles from <span className="font-medium text-foreground">OpenStreetMap</span>; ads come from{' '}
              <span className="font-medium text-foreground">Google</span>. To operate and secure the service, these
              providers may process standard technical request logs, which can include your IP address.
            </p>
          </Sec>

          <Sec title="Legislative data">
            <p>
              The bills, legislators, votes, and committee information shown here are public records obtained from
              official government sources and the Open States project, concerning public officials acting in their
              official capacity.
            </p>
          </Sec>

          <Sec title="Your choices">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Manage or opt out of ad personalization via your Google Ad Settings (linked above).</li>
              <li>Block or clear cookies in your browser settings (some ads may still appear, just non-personalized).</li>
              <li>Clear this site's stored preferences by clearing your browser's local storage.</li>
            </ul>
          </Sec>

          <Sec title="What we don't do">
            <p>We do not sell or rent your personal information.</p>
          </Sec>

          <Sec title="Contact">
            <p>Questions about this policy can be directed to the site operator.</p>
          </Sec>

          <p className="text-xs">
            This policy is provided in good faith for an informational tool and is not legal advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
