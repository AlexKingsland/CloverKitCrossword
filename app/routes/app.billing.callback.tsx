import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const PLAN_BY_SUBSCRIPTION_NAME: Record<string, string> = {
  "CloverKit Crossword — Starter": "starter",
  "CloverKit Crossword — Pro": "pro",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    return redirect("/app/pricing");
  }

  // Activate the subscription
  const activateResponse = await admin.graphql(
    `#graphql
    mutation appSubscriptionActivate($id: ID!) {
      appSubscriptionActivate(id: $id) {
        userErrors { field message }
        appSubscription {
          id
          name
          status
        }
      }
    }`,
    {
      variables: { id: `gid://shopify/AppSubscription/${chargeId}` },
    },
  );

  const activateData = await activateResponse.json();
  const subscription = activateData.data?.appSubscriptionActivate?.appSubscription;

  if (!subscription) {
    return redirect("/app/pricing");
  }

  const plan = PLAN_BY_SUBSCRIPTION_NAME[subscription.name] ?? "starter";

  await prisma.shop.upsert({
    where: { shop: session.shop },
    create: {
      shop: session.shop,
      plan,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    },
    update: {
      plan,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    },
  });

  return redirect("/app");
};
