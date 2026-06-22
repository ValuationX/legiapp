import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/primitives';

export default function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="About Bill Aid" subtitle="What this tool is, and who built it." />
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Bill Aid</span> brings legislation, legislators,
              committees, votes, and chamber leadership from U.S. state legislatures into one fast, searchable
              place — with a focus on surfacing foreign-affairs and Ukraine-related measures and the lawmakers
              behind them.
            </p>
            <p>
              Every record is built from official public sources — California's PUBINFO bulk dataset and the
              Open States project — and is meant to speed up research, not replace it. Always confirm anything
              important against the official legislative record.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6 text-sm leading-relaxed text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground">About the author</h2>
            <p>
              Bill Aid is built and maintained by a Nova Ukraine advocate, to make legislative research faster
              and more accessible for the people and organizations tracking the issues they care about.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
