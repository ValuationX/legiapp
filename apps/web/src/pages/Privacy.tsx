import * as React from 'react';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/primitives';

const UPDATED = 'June 22, 2026';

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
          <p>Bill Aid is an informational research tool, and it is built to collect as little about you as possible.</p>

          <Sec title="What we store">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Bill Aid has no user accounts. Access is gated by a shared code; entering it sets a single secure
                cookie so you stay signed in. That cookie holds a verification token — never the code itself.
              </li>
              <li>
                Your preferences (theme, selected state, and whether the foreign-affairs layer is shown) are saved
                only in your browser's local storage. They stay on your device and are never sent to us.
              </li>
              <li>We do not run advertising or third-party analytics or tracking scripts.</li>
            </ul>
          </Sec>

          <Sec title="Service providers">
            <p>
              The app is hosted on Vercel and stores its data in a Neon (PostgreSQL) database; interactive maps use
              tiles from OpenStreetMap. To operate and secure the service, these providers may process standard
              technical request logs, which can include your IP address.
            </p>
          </Sec>

          <Sec title="Legislative data">
            <p>
              The bills, legislators, votes, and committee information shown here are public records obtained from
              official government sources and the Open States project, concerning public officials acting in their
              official capacity.
            </p>
          </Sec>

          <Sec title="What we don't do">
            <p>We do not sell or rent your information, and we do not build advertising profiles.</p>
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
