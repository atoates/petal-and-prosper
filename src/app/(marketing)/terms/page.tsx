import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Petal & Prosper",
  description:
    "Terms and conditions governing the use of the Petal & Prosper platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-12">
          Last updated: 13 April 2026
        </p>

        <div className="prose prose-gray prose-lg max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              1. Introduction
            </h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use
              of the Petal &amp; Prosper website, application, and related
              services (the &ldquo;Service&rdquo;) provided by Petal &amp; Prosper
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
            </p>
            <p>
              By creating an account or using the Service, you agree to be bound
              by these Terms. If you do not agree, you must not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years old and have the legal authority to
              enter into these Terms on behalf of yourself or the business you
              represent. By using the Service, you represent and warrant that you
              meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              3. Account registration
            </h2>
            <p>
              To use the Service, you must create an account with accurate and
              complete information. You are responsible for maintaining the
              confidentiality of your login credentials and for all activity
              that occurs under your account.
            </p>
            <p>
              You must notify us immediately at{" "}
              <a
                href="mailto:support@petalandprosper.com"
                className="text-[#1B4332] hover:underline"
              >
                support@petalandprosper.com
              </a>{" "}
              if you suspect unauthorised access to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              4. Subscription and payment
            </h2>
            <p>
              The Service is offered on a subscription basis. Pricing,
              features, and billing frequency are described on our pricing page
              and may change with reasonable notice. All fees are quoted in
              British Pounds (GBP) and are exclusive of VAT unless stated
              otherwise.
            </p>
            <p>
              Subscriptions renew automatically at the end of each billing
              period. You may cancel your subscription at any time through your
              account settings. Cancellation takes effect at the end of the
              current billing period, and no refunds are issued for partial
              periods.
            </p>
            <p>
              If payment fails, we will notify you and may suspend access to the
              Service until payment is received. We reserve the right to change
              our prices with at least 30 days&apos; notice before the next billing
              cycle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              5. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorised access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Resell or redistribute the Service without our written consent</li>
              <li>Use the Service to send unsolicited commercial communications (spam)</li>
              <li>Scrape, crawl, or extract data from the Service by automated means</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate
              these terms without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              6. Your data
            </h2>
            <p>
              You retain ownership of all data you upload or enter into the
              Service (&ldquo;Your Data&rdquo;). You grant us a limited licence to
              store, process, and display Your Data solely for the purpose of
              providing the Service.
            </p>
            <p>
              You are responsible for the accuracy, legality, and
              appropriateness of Your Data, including ensuring you have proper
              consent to store personal data belonging to your clients in
              accordance with applicable data protection legislation.
            </p>
            <p>
              We will handle Your Data in accordance with our{" "}
              <a href="/privacy" className="text-[#1B4332] hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              7. Intellectual property
            </h2>
            <p>
              The Service, including its design, code, features, documentation,
              and branding, is owned by Petal &amp; Prosper and protected by
              copyright, trademark, and other intellectual property laws. These
              Terms do not grant you any rights to our intellectual property
              except the limited right to use the Service as described herein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              8. Service availability
            </h2>
            <p>
              We aim to keep the Service available at all times but do not
              guarantee uninterrupted access. The Service may be temporarily
              unavailable due to maintenance, updates, or circumstances beyond
              our control. We will endeavour to provide advance notice of
              planned downtime where possible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              9. Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, the Service is provided
              &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
              whether express or implied, including but not limited to implied
              warranties of merchantability, fitness for a particular purpose,
              and non-infringement.
            </p>
            <p>
              We shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits,
              revenue, data, or business opportunities arising from your use of
              the Service, even if we have been advised of the possibility of
              such damages.
            </p>
            <p>
              Our total liability to you for all claims arising from or relating
              to the Service shall not exceed the fees you paid to us in the
              twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              10. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Petal &amp; Prosper, its
              directors, employees, and agents from any claims, liabilities,
              damages, losses, or expenses (including legal fees) arising from
              your use of the Service, your violation of these Terms, or your
              violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              11. Termination
            </h2>
            <p>
              Either party may terminate these Terms at any time. You may cancel
              your account through your account settings or by contacting us.
              We may suspend or terminate your access if you breach these Terms
              or if continued provision of the Service is no longer commercially
              viable.
            </p>
            <p>
              Upon termination, your right to use the Service ceases
              immediately. You may export Your Data before termination. We will
              retain Your Data for up to 90 days following account closure,
              after which it will be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              12. Changes to these Terms
            </h2>
            <p>
              We may modify these Terms from time to time. We will notify you of
              material changes by email or through a notice in the Service at
              least 30 days before they take effect. Your continued use of the
              Service after the changes take effect constitutes acceptance of
              the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              13. Governing law
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the
              laws of England and Wales. Any disputes arising under these Terms
              shall be subject to the exclusive jurisdiction of the courts of
              England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              14. Contact us
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:support@petalandprosper.com"
                className="text-[#1B4332] hover:underline"
              >
                support@petalandprosper.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
