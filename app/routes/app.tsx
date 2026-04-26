import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useEffect } from "react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Track which shops have had their app URL metafield synced this server process.
// Cleared on server restart (which happens when the dev tunnel URL changes),
// so the metafield always reflects the current tunnel during local development.
const syncedShops = new Set<string>();

async function syncAppUrlMetafield(admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"]) {
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (!appUrl) return;
  try {
    const res = await admin.graphql(`#graphql
      query { currentAppInstallation { id } }
    `);
    const { data } = await res.json();
    const installationId = data?.currentAppInstallation?.id;
    if (!installationId) return;
    await admin.graphql(`#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `, {
      variables: {
        metafields: [{
          ownerId: installationId,
          namespace: "cloverkit",
          key: "app_url",
          value: appUrl,
          type: "single_line_text_field",
        }],
      },
    });
  } catch {
    // Non-critical — never break the admin app if the sync fails
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Sync the app URL into an app-installation metafield so the theme extension
  // can read it via {{ app.metafields.cloverkit.app_url }} in Liquid.
  if (!syncedShops.has(session.shop)) {
    syncedShops.add(session.shop);
    syncAppUrlMetafield(admin); // fire-and-forget — don't await
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  const isExempt =
    pathname.startsWith("/app/pricing") ||
    pathname.startsWith("/app/analytics");

  let requiresPricing = false;

  if (!isExempt) {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop: session.shop },
    });
    requiresPricing = !shopRecord?.plan;
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "", requiresPricing };
};

export default function App() {
  const { apiKey, requiresPricing } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    if (requiresPricing) navigate("/app/pricing");
  }, [requiresPricing, navigate]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
