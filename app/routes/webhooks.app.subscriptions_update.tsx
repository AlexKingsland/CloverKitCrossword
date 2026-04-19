import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const subscription = payload as {
    app_subscription: { admin_graphql_api_id: string; status: string };
  };

  const subscriptionId = subscription?.app_subscription?.admin_graphql_api_id;
  const status = subscription?.app_subscription?.status;

  if (subscriptionId && status) {
    // Match on shop only — the cancel action may have already cleared subscriptionId
    // before this webhook fires, so matching on both would miss the record.
    await db.shop.updateMany({
      where: { shop },
      data: { subscriptionStatus: status },
    });

    // Subscription ended — fall back to free plan.
    // FROZEN is a temporary Shopify-initiated hold; keep the plan, just update status.
    if (["CANCELLED", "DECLINED", "EXPIRED"].includes(status)) {
      await db.shop.updateMany({
        where: { shop },
        data: { plan: "free", subscriptionId: null, subscriptionStatus: status },
      });
    }
  }

  return new Response();
};
