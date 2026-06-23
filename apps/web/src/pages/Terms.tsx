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

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Terms of Use" subtitle={`Last updated ${UPDATED}`} />
      <Card>
        <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
          <p>By accessing Bill Aid, you agree to these terms. If you do not agree, please do not use the service.</p>

          <Sec title="Informational use only">
            <p>
              Bill Aid is a research aid. It does not provide legal, political, or professional advice, and it is not
              a substitute for the official legislative record. Always verify anything important against the relevant
              legislature's official source before relying on it.
            </p>
          </Sec>

          <Sec title="Accuracy of data">
            <p>
              Information is aggregated from official government sources and the Open States project and is provided
              "as is." It may be incomplete, delayed, or contain errors, and coverage varies by state. We make no
              warranty that the data is accurate, current, or complete.
            </p>
          </Sec>

          <Sec title="Acceptable use">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Do not attempt to disrupt, overload, scrape in bulk, reverse-engineer, or gain unauthorized access to
                the service or its underlying systems.
              </li>
              <li>Use the information lawfully and responsibly.</li>
            </ul>
          </Sec>

          <Sec title="Advertising & third-party services">
            <p>
              Bill Aid is free and supported by advertising. We display ads through Google AdSense and use Vercel for
              hosting and privacy-friendly analytics; these third parties may collect data as described in our{' '}
              <a href="/privacy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </a>
              . Ads and any third-party links are not endorsements, and we are not responsible for third-party content
              or websites.
            </p>
          </Sec>

          <Sec title="Limitation of liability">
            <p>
              To the fullest extent permitted by law, Bill Aid and its author are not liable for any loss or damage
              arising from your use of, or reliance on, the service or its data.
            </p>
          </Sec>

          <Sec title="Changes">
            <p>
              These terms may be updated from time to time. Continued use after a change constitutes acceptance of
              the revised terms.
            </p>
          </Sec>

          <Sec title="Contact">
            <p>Questions about these terms can be directed to the site operator.</p>
          </Sec>

          <p className="text-xs">
            These terms are provided in good faith for an informational tool and are not legal advice; consider review
            by qualified counsel before relying on them.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
