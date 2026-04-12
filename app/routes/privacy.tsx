export default function PrivacyPolicy() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.h1}>Privacy Policy</h1>
        <p style={styles.meta}>
          <strong>App:</strong> CloverKit Crossword&nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Developer:</strong> CloverKit Studio&nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Last updated:</strong> April 2026
        </p>

        <p>
          This Privacy Policy describes how CloverKit Studio ("we", "us", or
          "our") collects, uses, and handles information when you install and use
          the <strong>CloverKit Crossword</strong> app ("the App") available on
          the Shopify App Store.
        </p>

        <h2 style={styles.h2}>1. Information We Collect</h2>

        <h3 style={styles.h3}>Merchant account data</h3>
        <p>
          When you install the App through Shopify's OAuth flow, we receive and
          store the following information about your Shopify account:
        </p>
        <ul>
          <li>Shop domain (e.g. yourstore.myshopify.com)</li>
          <li>Account owner first name, last name, and email address</li>
          <li>Store locale and region</li>
          <li>OAuth access token (used to make authorised API calls to your store)</li>
          <li>Granted API scopes</li>
        </ul>

        <h3 style={styles.h3}>Subscription and billing data</h3>
        <p>
          If you subscribe to the Pro plan, we store the following in connection
          with your shop:
        </p>
        <ul>
          <li>Your chosen plan (Free or Pro)</li>
          <li>Shopify subscription ID</li>
          <li>Subscription status (e.g. ACTIVE, CANCELLED)</li>
          <li>Free trial end date (where applicable)</li>
        </ul>
        <p>
          All billing and payment processing is handled entirely by Shopify via
          the Shopify Billing API. We never receive or store credit card or
          payment details.
        </p>

        <h3 style={styles.h3}>Storefront engagement analytics</h3>
        <p>
          When visitors to your store interact with the CloverKit Crossword
          puzzle block, the following events are recorded for analytics purposes:
        </p>
        <ul>
          <li>
            <strong>crossword_puzzle_started</strong> — shop domain, puzzle
            difficulty, your plan tier
          </li>
          <li>
            <strong>crossword_puzzle_completed</strong> — shop domain, puzzle
            difficulty, time elapsed (seconds), your plan tier
          </li>
        </ul>
        <p>
          No customer personal information (name, email address, customer ID, IP
          address, or any other identifier) is collected or transmitted as part
          of these events. Analytics are aggregated at the shop level only.
        </p>

        <h2 style={styles.h2}>2. How We Use Your Information</h2>
        <p>We use the information collected to:</p>
        <ul>
          <li>Authenticate your Shopify store and maintain your session</li>
          <li>Manage your subscription and enforce plan-based feature access</li>
          <li>
            Display engagement analytics on your Pro dashboard (puzzle
            starts, completions, and completion times)
          </li>
          <li>Improve the App and diagnose technical issues</li>
        </ul>

        <h2 style={styles.h2}>3. Third-Party Services</h2>

        <h3 style={styles.h3}>PostHog (Analytics)</h3>
        <p>
          We use <strong>PostHog</strong> (posthog.com) to collect and process
          the storefront engagement events described above. PostHog acts as a
          data sub-processor on our behalf. Events sent to PostHog contain only
          shop-level metadata — no customer personal data is included. PostHog's
          privacy policy is available at{" "}
          <a href="https://posthog.com/privacy" target="_blank" rel="noreferrer">
            posthog.com/privacy
          </a>
          .
        </p>

        <h3 style={styles.h3}>Shopify</h3>
        <p>
          The App is distributed through and operates within the Shopify
          platform. Shopify's privacy policy governs the data Shopify collects
          independently of this App. See{" "}
          <a
            href="https://www.shopify.com/legal/privacy"
            target="_blank"
            rel="noreferrer"
          >
            shopify.com/legal/privacy
          </a>
          .
        </p>

        <h2 style={styles.h2}>4. Data Retention</h2>
        <p>
          Merchant account data and subscription records are retained for as long
          as the App is installed on your store. When you uninstall the App:
        </p>
        <ul>
          <li>
            Your session data is deleted immediately upon receipt of the
            app/uninstalled webhook.
          </li>
          <li>
            All remaining shop data (subscription records, plan information) is
            permanently deleted within 48 hours in response to Shopify's
            shop/redact compliance webhook.
          </li>
          <li>
            PostHog analytics events are retained according to PostHog's
            standard data retention policy.
          </li>
        </ul>

        <h2 style={styles.h2}>5. GDPR and Privacy Rights</h2>
        <p>
          We comply with the EU General Data Protection Regulation (GDPR) and
          applicable privacy laws. As a merchant using this App, you have the
          right to:
        </p>
        <ul>
          <li>Request access to the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict processing of your data</li>
        </ul>
        <p>
          To exercise any of these rights, please contact us at the email address
          below. Shopify also handles data subject requests on behalf of
          merchants through its mandatory compliance webhook system, which this
          App fully supports.
        </p>
        <p>
          <strong>Customer data:</strong> This App does not collect, store, or
          process personal data belonging to your customers (store visitors).
          Customer interactions with the crossword puzzle are tracked only at an
          aggregate, anonymous level.
        </p>

        <h2 style={styles.h2}>6. Data Security</h2>
        <p>
          All data is transmitted over HTTPS/TLS. OAuth access tokens are stored
          securely in a PostgreSQL database with access limited to the App's
          backend server. We do not share your data with third parties other than
          the sub-processors listed in Section 3.
        </p>

        <h2 style={styles.h2}>7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The "Last
          updated" date at the top of this page reflects the most recent
          revision. Continued use of the App after any changes constitutes
          acceptance of the updated policy.
        </p>

        <h2 style={styles.h2}>8. Contact</h2>
        <p>
          If you have any questions about this Privacy Policy or how we handle
          your data, please contact us at:
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
  h3: {
    fontSize: "16px",
    fontWeight: 600,
    marginTop: "20px",
    marginBottom: "8px",
    color: "#374151",
  },
  meta: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "28px",
  },
};
