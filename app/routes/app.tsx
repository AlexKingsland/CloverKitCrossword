import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useEffect } from "react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const onPricing = url.pathname.startsWith("/app/pricing");

  let requiresPricing = false;

  if (!onPricing) {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop: session.shop },
    });

    const noPlan = !shopRecord?.plan;
    const freeTrialExpired =
      shopRecord?.plan === "free" &&
      shopRecord.freeTrialEndsAt != null &&
      shopRecord.freeTrialEndsAt < new Date();

    requiresPricing = noPlan || freeTrialExpired;
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "", requiresPricing };
};

export default function App() {
  const { apiKey, requiresPricing } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    if (requiresPricing) {
      navigate("/app/pricing");
    }
  }, [requiresPricing, navigate]);

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
