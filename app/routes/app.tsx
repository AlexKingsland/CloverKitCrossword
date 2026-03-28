import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const onPricing = url.pathname.startsWith("/app/pricing");

  if (!onPricing) {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop: session.shop },
    });

    const noPlan = !shopRecord?.plan;
    const freeTrialExpired =
      shopRecord?.plan === "free" &&
      shopRecord.freeTrialEndsAt != null &&
      shopRecord.freeTrialEndsAt < new Date();

    if (noPlan || freeTrialExpired) {
      const host = url.searchParams.get("host");
      return redirect(`/app/pricing${host ? `?host=${host}` : ""}`);
    }
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/pricing">Pricing</s-link>
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
