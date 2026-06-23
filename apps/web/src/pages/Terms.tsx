import * as React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/primitives';

const EFFECTIVE = 'June 23, 2026';
const CONTACT_EMAIL = 'arseniy.shafran@novaukraine.org';

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
      <PageHeader title="Terms of Use" subtitle={`Effective date: ${EFFECTIVE}`} />
      <Card>
        <CardContent className="space-y-7 p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            These terms of use (the &ldquo;Terms&rdquo;) govern your access to and use of Bill Aid&rsquo;s website and
            services (collectively, the &ldquo;Service&rdquo;). Bill Aid, also known as &ldquo;LegiApp,&rdquo; operates
            a platform that aggregates official public records about legislation in the United States. The Service is
            provided to you by Bill Aid (&ldquo;we,&rdquo; &ldquo;us&rdquo; or &ldquo;our&rdquo;). Please read these
            Terms carefully before using the Service. By accessing or using the Service, you agree to be bound by these
            Terms and our Privacy Policy. If you do not agree, do not use the Service.
          </p>

          <Sec title="1. Changes to the Terms">
            <p>
              We may modify these Terms at any time. When we do, we will post the revised Terms with an updated
              effective date. We may also provide additional notice for material changes. Your continued use of the
              Service after the updated Terms become effective constitutes your acceptance of the changes.
            </p>
          </Sec>

          <Sec title="2. About the Service">
            <p>
              Bill Aid compiles legislative information from public sources and presents it for educational and
              research purposes. We also provide related features such as search tools, analytics summaries, mapping
              interfaces and advertisements. We may, at our sole discretion, modify or discontinue any part of the
              Service without notice. The Service is offered &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do
              not promise uninterrupted or error-free operation.
            </p>
          </Sec>

          <Sec title="3. Eligibility &amp; User Accounts">
            <p>
              The Service is intended for individuals who are at least 13 years old. By using the Service, you
              represent that you meet this age requirement. In the future we may offer optional accounts or
              subscription services. If you create an account, you are responsible for maintaining the confidentiality
              of your credentials and for any activity under your account. You must notify us promptly if you suspect
              unauthorized use.
            </p>
          </Sec>

          <Sec title="4. Permitted &amp; Prohibited Uses">
            <p>
              You may use the Service solely for personal, non-commercial purposes and in compliance with these Terms,
              applicable laws and regulations. You agree not to:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Use the Service for any illegal purpose or to violate any local, state, national or international law.</li>
              <li>
                Post or transmit content that is unlawful, threatening, abusive, defamatory, obscene, harassing,
                hateful, discriminatory or otherwise objectionable.
              </li>
              <li>Engage in spamming, chain letters, junk mail, phishing or other unsolicited communications.</li>
              <li>
                Attempt to gain unauthorized access to the Service or other systems (e.g., by hacking, password mining,
                scraping or using automated tools).
              </li>
              <li>
                Interfere with or disrupt the Service or networks connected to the Service, including by introducing
                viruses or other malicious code.
              </li>
              <li>
                Copy, distribute, sell, modify or create derivative works from our content (including underlying source
                code, text, graphics and data) except as expressly permitted.
              </li>
              <li>Remove or alter any copyright, trademark or other proprietary notices contained on the Service.</li>
              <li>Misrepresent your identity or impersonate another person or entity.</li>
            </ul>
            <p>
              We reserve the right to investigate and take appropriate action, including removing content, suspending
              accounts or cooperating with law enforcement, if you violate these Terms.
            </p>
          </Sec>

          <Sec title="5. Intellectual Property">
            <p>
              The Service, including its design, text, graphics, compilation of data, logos and other materials, is
              protected by copyright, trademark and other intellectual-property laws. Bill Aid and its licensors retain
              all rights not expressly granted in these Terms. You may view or print content for your own informational
              use but may not reproduce, distribute or exploit it commercially without our permission. Some legislative
              content is in the public domain; however, our aggregation, formatting and presentation of that content
              constitute proprietary intellectual property.
            </p>
          </Sec>

          <Sec title="6. User Content">
            <p>
              If the Service later allows you to submit comments, reviews or other materials (&ldquo;User
              Content&rdquo;), you retain ownership of your submissions. By providing User Content, you grant us a
              non-exclusive, transferable, sublicensable, royalty-free, worldwide license to use, reproduce, modify,
              adapt, publish and display that content in connection with operating and improving the Service. You
              warrant that you have the necessary rights to grant this license and that your User Content complies with
              these Terms. We reserve the right, but are not obligated, to remove or edit User Content.
            </p>
          </Sec>

          <Sec title="7. Privacy">
            <p>
              Your privacy is important to us. Our{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{' '}
              explains how we collect, use and share personal information, and is subject to separate legal
              requirements.
            </p>
          </Sec>

          <Sec title="8. Third-Party Content &amp; Ads">
            <p>
              We may display links to third-party websites, services or resources. We do not endorse or control those
              third-party resources and are not responsible for their content or practices. Your use of third-party
              sites is at your own risk and subject to those sites&rsquo; terms and policies.
            </p>
            <p>
              The Service displays advertisements through Google AdSense and other networks. Ads are provided by third
              parties; any interactions with advertisers or third-party services are solely between you and the
              applicable third party.
            </p>
          </Sec>

          <Sec title="9. Disclaimers">
            <p>
              <span className="font-medium text-foreground">No legal or official advice.</span> The legislative
              information and summaries provided by Bill Aid are for general informational purposes only. While we
              strive to present accurate and up-to-date information, we do not guarantee its completeness or
              reliability. Always verify critical information against official sources before acting on it. No
              information on the Service should be construed as legal, financial or professional advice.
            </p>
            <p>
              <span className="font-medium text-foreground">Service provided &ldquo;as is.&rdquo;</span> To the fullest
              extent permitted by law, we make no warranties or representations of any kind, either express or implied,
              regarding the Service, including but not limited to warranties of merchantability, fitness for a
              particular purpose, non-infringement, accuracy or availability.
            </p>
          </Sec>

          <Sec title="10. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Bill Aid, its affiliates and their respective directors,
              officers, employees and agents will not be liable for any indirect, incidental, consequential, special or
              punitive damages arising out of or relating to your access to or use of (or inability to access or use)
              the Service. This includes damages for loss of profits, data or goodwill, even if we have been advised of
              the possibility of such damages. Our total liability under these Terms shall not exceed the greater of
              fifty U.S. dollars (US $50) or the amount you have paid to use the Service.
            </p>
            <p>
              Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so some
              of the above limitations may not apply to you. In that case, our liability will be limited to the maximum
              extent permitted by law.
            </p>
          </Sec>

          <Sec title="11. Indemnification">
            <p>
              You agree to indemnify and hold harmless Bill Aid, its affiliates and their respective officers,
              directors, employees and agents from any claims, damages, losses, liabilities, judgments, costs or
              expenses (including attorneys&rsquo; fees) arising out of or related to (a) your misuse of the Service,
              (b) your violation of these Terms or any applicable law, or (c) your violation of any third-party right.
            </p>
          </Sec>

          <Sec title="12. Termination">
            <p>
              We may suspend or terminate your access to the Service at any time for any reason, including if we
              reasonably believe that you have violated these Terms. Upon termination, your right to use the Service
              will immediately cease, and Sections 5 through 14 of these Terms will survive.
            </p>
            <p>
              You may discontinue your use of the Service at any time. If we provide user accounts, you may request to
              delete your account via the settings page or by contacting us.
            </p>
          </Sec>

          <Sec title="13. Governing Law &amp; Dispute Resolution">
            <p>
              These Terms are governed by and construed in accordance with the laws of the State of New Jersey, U.S.A.,
              without regard to its conflict of law principles. Any dispute arising from or relating to the Service or
              these Terms will be subject to the exclusive jurisdiction of the state and federal courts located in New
              Jersey. You consent to the personal jurisdiction of those courts.
            </p>
            <p>
              At our sole discretion, we may require any dispute to be resolved by binding arbitration under the rules
              of the American Arbitration Association. If we elect arbitration, you agree to waive any right to
              participate in class-action lawsuits or class-wide arbitration.
            </p>
          </Sec>

          <Sec title="14. Miscellaneous">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium text-foreground">Entire agreement.</span> These Terms constitute the
                entire agreement between you and Bill Aid regarding the Service and supersede any prior agreements. If
                any provision is found unenforceable, the remaining provisions will remain in full force and effect.
              </li>
              <li>
                <span className="font-medium text-foreground">Assignment.</span> You may not assign or transfer these
                Terms or your rights under them without our prior written consent. We may assign our rights without
                restriction.
              </li>
              <li>
                <span className="font-medium text-foreground">Waiver.</span> Our failure to enforce any provision of
                these Terms is not a waiver of our right to do so later.
              </li>
              <li>
                <span className="font-medium text-foreground">Severability.</span> If any part of these Terms is held
                to be invalid or unenforceable, the remaining parts will remain in full force and effect.
              </li>
            </ul>
          </Sec>

          <Sec title="15. Contact">
            <p>If you have questions about these Terms or the Service, please contact us at:</p>
            <p className="text-foreground">
              Bill Aid / LegiApp
              <br />
              Email:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>We value your feedback and will strive to respond promptly.</p>
          </Sec>
        </CardContent>
      </Card>
    </div>
  );
}
