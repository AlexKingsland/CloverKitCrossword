import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";

const PLAN_BY_SUBSCRIPTION_NAME: Record<string, string> = {
  "CloverKit Crossword — Starter": "starter",
  "CloverKit Crossword — Pro": "pro",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  const shop = url.searchParams.get("shop");

  if (!chargeId || !shop) {
    return redirect("/app/pricing");
  }

  const { admin } = await unauthenticated.admin(shop);

  // Subscription is auto-activated on approval — just fetch its current status
  const response = await admin.graphql(
    `#graphql
    query getSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
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

  const data = await response.json();
  const subscription = data.data?.node;

  if (!subscription) {
    return redirect("/app/pricing");
  }

  const plan = PLAN_BY_SUBSCRIPTION_NAME[subscription.name] ?? "starter";

  await prisma.shop.upsert({
    where: { shop },
    create: {
      shop,
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

  return redirect(`https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/pricing`);
};
