export default function TermsOfService() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.h1}>Terms of Service</h1>
        <p style={styles.meta}>
          <strong>App:</strong> CloverKit Crossword&nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Developer:</strong> CloverKit Studio&nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Last updated:</strong> April 2026
        </p>

        <p>
          Please read these Terms of Service ("Terms") carefully before
          installing or using the <strong>CloverKit Crossword</strong> app ("the
          App"). By installing the App you agree to be bound by these Terms.
        </p>

        <h2 style={styles.h2}>1. Eligibility</h2>
        <p>
          The App is available to merchants with an active Shopify store. You
          must have the authority to bind your business to these Terms. If you
          are using the App on behalf of a company or organisation, you represent
          that you have the authority to do so.
        </p>

        <h2 style={styles.h2}>2. The Service</h2>
        <p>
          CloverKit Crossword adds a daily crossword puzzle block to your
          Shopify storefront. A new puzzle is automatically published every 24
          hours. The App is offered on the following plans:
        </p>
        <ul>
          <li>
            <strong>Free Forever</strong> — full crossword functionality at no
            charge, with no credit card required.
          </li>
          <li>
            <strong>Analytics (Pro)</strong> — includes all Free features plus
            access to engagement analytics (puzzle starts, completions, and
            completion times).
          </li>
        </ul>
        <p>
          Plan features and pricing are as described on the App's pricing page
          at the time of subscription. We reserve the right to change pricing
          with reasonable notice.
        </p>

        <h2 style={styles.h2}>3. Billing</h2>
        <p>
          All billing is processed by Shopify via the Shopify Billing API and is
          subject to{" "}
          <a
            href="https://www.shopify.com/legal/terms"
            target="_blank"
            rel="noreferrer"
          >
            Shopify's Terms of Service
          </a>
          . We never collect or store your payment information directly. Paid
          subscriptions are billed on a recurring basis and can be cancelled at
          any time from within the App.
        </p>

        <h2 style={styles.h2}>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the App for any unlawful purpose or in violation of Shopify's Partner Programme policies</li>
          <li>Attempt to reverse-engineer, decompile, or extract the App's source code</li>
          <li>Resell, sublicense, or redistribute the App or its outputs</li>
          <li>Interfere with or disrupt the App's infrastructure or servers</li>
        </ul>

        <h2 style={styles.h2}>5. Intellectual Property</h2>
        <p>
          All content, code, and materials comprising the App are the property
          of CloverKit Studio or its licensors and are protected by applicable
          intellectual property laws. These Terms do not grant you any rights to
          our trademarks, logos, or brand features.
        </p>
        <p>
          Puzzle content is generated and owned by CloverKit Studio. You are
          granted a limited, non-exclusive licence to display this content on
          your storefront solely as part of the App's intended functionality.
        </p>

        <h2 style={styles.h2}>6. Disclaimer of Warranties</h2>
        <p>
          The App is provided "as is" and "as available" without warranties of
          any kind, either express or implied, including but not limited to
          implied warranties of merchantability, fitness for a particular
          purpose, or non-infringement. We do not warrant that the App will be
          uninterrupted, error-free, or free of harmful components.
        </p>

        <h2 style={styles.h2}>7. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, CloverKit Studio
          shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages arising out of or related to your
          use of the App, even if we have been advised of the possibility of such
          damages. Our total liability to you for any claim arising from these
          Terms or the App shall not exceed the amount you paid us in the 30 days
          preceding the claim.
        </p>

        <h2 style={styles.h2}>8. Termination</h2>
        <p>
          You may terminate these Terms at any time by uninstalling the App from
          your Shopify store. We may suspend or terminate your access to the App
          if you violate these Terms or if required to do so by law. Upon
          termination, your data will be handled in accordance with our{" "}
          <a href="/privacy" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
          .
        </p>

        <h2 style={styles.h2}>9. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. The "Last updated" date
          at the top of this page reflects the most recent revision. Continued
          use of the App after any changes constitutes acceptance of the updated
          Terms.
        </p>

        <h2 style={styles.h2}>10. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with applicable
          law. Any disputes arising under these Terms shall be resolved through
          good-faith negotiation in the first instance.
        </p>

        <h2 style={styles.h2}>11. Contact</h2>
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <p>
          <strong>CloverKit Studio</strong>
          <br />
          Email:{" "}
          <a href="mailto:cloverkitstudio@gmail.com">
            cloverkitstudio@gmail.com
          </a>
          <br />
          Website:{" "}
          <a
            href="https://cloverkitstudio.com"
            target="_blank"
            rel="noreferrer"
          >
            cloverkitstudio.com
          </a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
    padding: "40px 16px",
    color: "#111827",
  },
  container: {
    maxWidth: "760px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "48px 56px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    lineHeight: "1.7",
  },
  h1: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "8px",
    color: "#111827",
  },
  h2: {
    fontSize: "20px",
    fontWeight: 600,
    marginTop: "36px",
    marginBottom: "12px",
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "6px",
  },
  meta: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "28px",
  },
};
