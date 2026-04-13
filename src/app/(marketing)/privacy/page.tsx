import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Petal & Prosper",
  description:
    "How Petal & Prosper collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-12">
          Last updated: 13 April 2026
        </p>

        <div className="prose prose-gray prose-lg max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              1. Who we are
            </h2>
            <p>
              Petal &amp; Prosper (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) provides
              cloud-based business management software for floristry businesses.
              We are the data controller for the personal information we collect
              through our website at petalandprosper.com and the Petal &amp; Prosper
              application (together, the &ldquo;Service&rdquo;).
            </p>
            <p>
              If you have questions about this policy or your personal data,
              please contact us at{" "}
              <a
                href="mailto:privacy@petalandprosper.com"
                className="text-[#1B4332] hover:underline"
              >
                privacy@petalandprosper.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              2. Information we collect
            </h2>
            <p>
              We collect information you provide directly when you create an
              account, subscribe to a plan, or contact us. This typically
              includes your name, email address, phone number, business name,
              and billing details.
            </p>
            <p>
              When you use the Service we also collect data you enter into the
              application, such as client contact details, enquiry records, order
              information, and financial data. This information is stored on your
              behalf and you remain the data controller for your own client
              records.
            </p>
            <p>
              We automatically collect certain technical information when you
              visit our website or use the Service, including your IP address,
              browser type, device information, pages visited, and referring
              URLs. We use cookies and similar technologies for this purpose
              (see section 7).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              3. How we use your information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your subscription payments</li>
              <li>Send you important service communications (e.g. security alerts, billing notices)</li>
              <li>Respond to your enquiries and support requests</li>
              <li>Send marketing communications where you have opted in</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with our legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              4. Legal basis for processing
            </h2>
            <p>
              We process your personal data on the following legal grounds under
              UK GDPR:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>Contract:</strong> processing necessary to provide the
                Service you have subscribed to
              </li>
              <li>
                <strong>Legitimate interests:</strong> improving the Service,
                ensuring security, and communicating with you about your account
              </li>
              <li>
                <strong>Consent:</strong> marketing communications and
                non-essential cookies
              </li>
              <li>
                <strong>Legal obligation:</strong> where we are required to
                retain or disclose data by law
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              5. Sharing your information
            </h2>
            <p>
              We do not sell your personal data. We may share your information
              with trusted third-party service providers who help us operate the
              Service (e.g. hosting, payment processing, email delivery). These
              providers are contractually required to protect your data and may
              only use it to perform services on our behalf.
            </p>
            <p>
              We may also disclose your information if required by law, to
              protect our rights, or in connection with a business transfer such
              as a merger or acquisition.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              6. Data retention
            </h2>
            <p>
              We retain your account data for as long as your account is active
              or as needed to provide the Service. If you close your account, we
              will delete or anonymise your personal data within 90 days, except
              where we are required to retain it for legal, accounting, or
              regulatory purposes.
            </p>
            <p>
              Business data you enter into the Service (client records, orders,
              invoices) is retained for the duration of your subscription and
              deleted within 90 days of account closure unless you export it
              beforehand.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              7. Cookies
            </h2>
            <p>
              We use essential cookies to keep you signed in and remember your
              preferences. We may also use analytics cookies to understand how
              the Service is used. You can manage cookie preferences through
              your browser settings. Disabling essential cookies may affect
              functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              8. Data security
            </h2>
            <p>
              We implement appropriate technical and organisational measures to
              protect your personal data, including encryption in transit
              (TLS/SSL), encryption at rest, regular security assessments, and
              access controls. However, no method of electronic storage or
              transmission is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              9. International transfers
            </h2>
            <p>
              Your data may be processed in countries outside the United Kingdom.
              Where this occurs, we ensure appropriate safeguards are in place,
              such as standard contractual clauses approved by the UK Information
              Commissioner&apos;s Office.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              10. Your rights
            </h2>
            <p>
              Under UK data protection law, you have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing</li>
              <li>Request portability of your data</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please email us at{" "}
              <a
                href="mailto:privacy@petalandprosper.com"
                className="text-[#1B4332] hover:underline"
              >
                privacy@petalandprosper.com
              </a>
              . We will respond within 30 days.
            </p>
            <p>
              You also have the right to lodge a complaint with the Information
              Commissioner&apos;s Office (ICO) at{" "}
              <span className="text-[#1B4332]">ico.org.uk</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-gray-900 mt-10 mb-4">
              11. Changes to this policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will
              notify you of material changes by email or through a notice in the
              Service. Your continued use of the Service after changes take
              effect constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
