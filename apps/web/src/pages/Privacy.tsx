import * as React from 'react';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/primitives';

const UPDATED = 'June 23, 2026';
const CONTACT_EMAIL = 'arseniy.shafran@novaukraine.org';

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Privacy Policy" subtitle={`Last updated ${UPDATED}`} />
      <Card>
        <CardContent className="space-y-7 p-6 text-sm leading-relaxed text-muted-foreground">
          <Sec title="1. About Bill Aid (LegiApp)">
            <p>
              Bill Aid (also referred to as &ldquo;LegiApp,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; and
              &ldquo;our&rdquo;) is a U.S.-based research tool that aggregates and organizes public legislative data
              into an easy-to-search interface. It enables people to track bills, legislators, committees and related
              public information across U.S. states. This privacy policy explains how we collect, use and share
              information when people visit our website, use our services or contact us. For the purposes of
              data-protection laws in the European Economic Area (EEA), the United Kingdom, Canada and other
              jurisdictions, Bill Aid is the data controller of personal information processed under this policy.
            </p>
            <p>
              This policy applies only to our website at{' '}
              <a href="https://legiapp-api.vercel.app/" className="text-primary hover:underline">
                https://legiapp-api.vercel.app/
              </a>{' '}
              and any related mobile applications or services that link to it. We do not control the privacy practices
              of third-party sites linked from our service. Our services are primarily intended for adults; we do not
              knowingly collect data from children under 13 years of age.
            </p>
          </Sec>

          <Sec title="2. Information We Collect">
            <p>
              We collect information in three broad ways: (a) information you provide directly, (b) information we
              collect automatically when you use our services, and (c) information we display that comes from public
              sources. Data-protection laws require us to describe each category and its purpose clearly.
            </p>
            <Sub title="2.1 Information You Provide">
              <p>
                When you voluntarily interact with us, such as by contacting us via email or providing feedback, we
                may collect personal identifiers like your name, email address, postal address or other contact
                details. If in the future we offer user accounts, subscription services or newsletters, we may also
                collect registration information (e.g., username, password, preferences) and billing information to
                process transactions. You are not required to provide personal information; however, some features may
                not work without it.
              </p>
            </Sub>
            <Sub title="2.2 Information We Collect Automatically">
              <p>When you access our services, our servers and analytics tools automatically record certain technical information. This includes:</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <span className="font-medium text-foreground">Usage data</span> &mdash; such as pages viewed, search
                  terms, features used, referring URLs, timestamps and other diagnostic information. We use
                  privacy-friendly analytics services (e.g., Vercel Web Analytics) to aggregate this data.
                </li>
                <li>
                  <span className="font-medium text-foreground">Device and connection data</span> &mdash; such as your
                  IP address, browser type, operating system, screen size and device identifiers. This helps us
                  troubleshoot and improve performance.
                </li>
                <li>
                  <span className="font-medium text-foreground">Cookies and tracking technologies</span> &mdash; as
                  described in Section 6 below.
                </li>
              </ul>
            </Sub>
            <Sub title="2.3 Information from Public Sources">
              <p>
                Much of the content on Bill Aid consists of public records (e.g., legislative bills, votes and
                committee rosters). These data sets are compiled from official government sources and do not reveal
                private personal information. We may display names of public office-holders and their voting records,
                which are already public information and are not collected for marketing purposes.
              </p>
            </Sub>
          </Sec>

          <Sec title="3. How We Use Information">
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium text-foreground">To provide and maintain our services.</span> We process
                usage, device and contact data to deliver the features of our website, troubleshoot issues and
                personalize your experience.
              </li>
              <li>
                <span className="font-medium text-foreground">To communicate with you.</span> If you contact us, we may
                use your details to respond to questions, provide technical support or send service-related
                announcements. With your consent, we may send marketing or research communications; you may opt out at
                any time.
              </li>
              <li>
                <span className="font-medium text-foreground">To perform analytics and improve the service.</span> We
                analyze aggregated usage patterns to understand what features are most popular, measure performance and
                improve the user experience. We do not combine analytics data with personally identifiable information.
              </li>
              <li>
                <span className="font-medium text-foreground">To serve advertising and monetize the service.</span> To
                keep the site free, we display ads via Google AdSense. Ad partners may use cookies or mobile
                identifiers to serve relevant ads. See Section 6 for more details on advertising cookies.
              </li>
              <li>
                <span className="font-medium text-foreground">To enforce legal terms and comply with law.</span> We may
                use information to enforce our terms of use, investigate misuse, respond to lawful requests and meet
                legal obligations.
              </li>
              <li>
                <span className="font-medium text-foreground">For other purposes with notice.</span> We may use
                information for other purposes explained at the time of collection or with your consent.
              </li>
            </ul>
          </Sec>

          <Sec title="4. Legal Basis for Processing (EEA/UK Users)">
            <p>If you are located in the EEA or the UK, we process personal information on the following legal bases:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium text-foreground">Performance of a contract.</span> When you use our
                services or contact us, we process certain data to perform our obligations under our terms of use.
              </li>
              <li>
                <span className="font-medium text-foreground">Legitimate interests.</span> We process data to operate,
                protect and improve our services, including measuring performance, responding to inquiries and
                preventing misuse. We balance our legitimate interests against your privacy rights.
              </li>
              <li>
                <span className="font-medium text-foreground">Consent.</span> In limited cases, such as sending
                marketing emails or using certain advertising cookies, we rely on your consent. You may withdraw
                consent at any time.
              </li>
              <li>
                <span className="font-medium text-foreground">Compliance with legal obligations.</span> We process and
                retain certain data to meet tax, regulatory and other legal obligations.
              </li>
            </ul>
          </Sec>

          <Sec title="5. Sharing &amp; Disclosure of Information">
            <p>We do not sell or rent your personal information. We may share information under the following circumstances:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium text-foreground">Service providers and partners.</span> We use third-party
                vendors to host the site, deliver analytics, display ads, provide mapping tiles and process payments.
                For example, Vercel hosts our site and provides analytics, while Google AdSense serves advertisements.
                We may also use Mapbox to provide interactive maps. These providers process data on our behalf and are
                bound by contractual obligations.
              </li>
              <li>
                <span className="font-medium text-foreground">Advertising partners.</span> To display ads, we allow
                Google AdSense to collect information via cookies or device identifiers. This helps support our service
                but does not enable us to identify you directly.
              </li>
              <li>
                <span className="font-medium text-foreground">Legal and compliance.</span> We may disclose information
                if required to do so by law, to comply with legal processes or to protect the rights, property or
                safety of Bill Aid, our users or others. We may also share information in response to lawful requests
                by public authorities.
              </li>
              <li>
                <span className="font-medium text-foreground">Business transfers.</span> If Bill Aid engages in a
                merger, acquisition or asset sale, we may transfer user information as part of that transaction. We
                will provide notice before personal data is transferred and becomes subject to a different privacy
                policy.
              </li>
              <li>
                <span className="font-medium text-foreground">With your consent.</span> We may share information for
                other purposes if you consent.
              </li>
            </ul>
          </Sec>

          <Sec title="6. Cookies &amp; Tracking Technologies">
            <p>
              Like most websites, we use cookies and similar technologies. Cookies are small files placed on your
              device that help us remember your preferences and understand how visitors interact with our service.
            </p>
            <Sub title="6.1 Types of Cookies We Use">
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <span className="font-medium text-foreground">Essential cookies.</span> These cookies are necessary
                  to deliver core functionality (e.g., remembering your theme preference or login status). Without
                  them, the site may not function properly.
                </li>
                <li>
                  <span className="font-medium text-foreground">Analytics cookies.</span> We use Vercel Web Analytics
                  and Speed Insights, which are privacy-friendly analytics services. They count page views and measure
                  performance but do not use cookies or track you across websites; the data is aggregated and
                  anonymized.
                </li>
                <li>
                  <span className="font-medium text-foreground">Advertising cookies.</span> Google AdSense may place
                  cookies on your device or use advertising identifiers to display ads. These cookies help deliver
                  relevant advertisements and measure ad performance. Google&rsquo;s use of advertising cookies is
                  governed by Google&rsquo;s AdSense policies and your ad preferences. You can learn more and opt out
                  of personalized ads via Google&rsquo;s Ad Settings.
                </li>
                <li>
                  <span className="font-medium text-foreground">Third-party cookies.</span> If we embed content from
                  external sites (e.g., social media widgets, maps), those third parties may set their own cookies. We
                  encourage you to review the privacy policies of those providers.
                </li>
              </ul>
            </Sub>
            <Sub title="6.2 Your Choices">
              <p>
                Most browsers allow you to manage cookie preferences (e.g., accept, reject or delete cookies). You can
                also use browser plugins to block trackers. However, disabling cookies may limit certain
                functionalities. We do not respond differently to &ldquo;Do Not Track&rdquo; signals, but you can use
                the cookie settings described above to control tracking.
              </p>
            </Sub>
          </Sec>

          <Sec title="7. Data Retention">
            <p>
              We retain personal information only as long as necessary to fulfil the purposes outlined in this policy
              or to comply with legal requirements. For example, we keep server logs for a limited time for
              troubleshooting and security, and we retain contact records for as long as needed to resolve inquiries.
              When we no longer have a legitimate need to process your data, we will delete or anonymize it.
            </p>
          </Sec>

          <Sec title="8. Security">
            <p>
              We employ administrative, technical and physical safeguards designed to protect personal information
              against unauthorized access, loss or misuse. These may include encrypted connections (HTTPS), secure
              hosting environments, access controls, regular security assessments and employee training. Despite our
              efforts, no method of transmission or storage is completely secure; we cannot guarantee absolute
              security, and you use the service at your own risk.
            </p>
          </Sec>

          <Sec title="9. International Data Transfers">
            <p>
              Our servers are hosted in the United States. If you access our services from outside the United States,
              information may be transferred to and processed in countries that may not provide the same level of data
              protection. Where required by law, we use appropriate safeguards, such as standard contractual clauses
              approved by the European Commission, to protect personal data during cross-border transfers.
            </p>
          </Sec>

          <Sec title="10. Your Rights &amp; Choices">
            <p>Depending on your residence, you may have certain rights regarding your personal information, such as:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium text-foreground">Access, correction and deletion.</span> You can request a
                copy of the personal data we hold about you, ask us to correct inaccurate information or ask us to
                delete your data in certain circumstances.
              </li>
              <li>
                <span className="font-medium text-foreground">Restriction and objection.</span> You may request that we
                restrict processing of your information or object to processing based on our legitimate interests.
              </li>
              <li>
                <span className="font-medium text-foreground">Data portability.</span> Where applicable, you may
                request to receive your information in a structured, machine-readable format and have it transferred to
                another controller.
              </li>
              <li>
                <span className="font-medium text-foreground">Withdrawal of consent.</span> If we process your
                information based on consent, you may withdraw that consent at any time.
              </li>
              <li>
                <span className="font-medium text-foreground">Opting out of marketing.</span> You can opt out of
                marketing emails by following the unsubscribe link in our communications or contacting us.
              </li>
              <li>
                <span className="font-medium text-foreground">Non-discrimination.</span> We will not discriminate
                against you for exercising your privacy rights.
              </li>
            </ul>
            <p>
              To exercise any of the above rights, please contact us using the details in Section 15. We may need to
              verify your identity before processing your request and may deny requests where permitted by law.
              Individuals in the EEA/UK have the right to lodge a complaint with a data-protection authority.
            </p>
          </Sec>

          <Sec title="11. Children's Privacy">
            <p>
              Our services are not directed to children under the age of 13, and we do not knowingly collect personal
              information from children. If you believe that a child has provided us with personal information, please
              contact us, and we will take steps to remove that information. If we become aware that we have
              inadvertently collected personal information from a child without parental consent, we will delete it.
            </p>
          </Sec>

          <Sec title="12. Third-Party Services &amp; Links">
            <p>
              Our services may contain links to third-party websites and services (e.g., government sites, news
              articles, advertisements). We do not control and are not responsible for the privacy practices of those
              third parties. We encourage you to read the privacy policies of every site you visit.
            </p>
          </Sec>

          <Sec title="13. Business Transfers">
            <p>
              If we are involved in a merger, acquisition, financing or sale of assets, user information may be
              transferred as part of that transaction. We will notify you via a prominent notice on our website or via
              email (if you have provided your email address) if such a transaction results in a material change to
              this policy.
            </p>
          </Sec>

          <Sec title="14. Changes to This Policy">
            <p>
              We may update this privacy policy from time to time. We will post the revised policy with a new effective
              date at the top of this page. If we make material changes, we will provide additional notice (e.g., via
              email or pop-up notification). Your continued use of the service after the new policy takes effect
              constitutes acceptance of the updated policy.
            </p>
          </Sec>

          <Sec title="15. Contact Us">
            <p>
              If you have any questions about this privacy policy, wish to exercise your rights or have concerns about
              our handling of personal information, please contact us at:
            </p>
            <p className="text-foreground">
              Bill Aid / LegiApp
              <br />
              Email:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>
              We aim to respond to privacy-related inquiries within 30 days. If you are located in the EEA or the UK
              and are not satisfied with our response, you have the right to lodge a complaint with your local
              data-protection authority.
            </p>
          </Sec>
        </CardContent>
      </Card>
    </div>
  );
}
