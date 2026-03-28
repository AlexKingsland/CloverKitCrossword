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
    await db.shop.updateMany({
      where: { shop, subscriptionId },
      data: { subscriptionStatus: status },
    });

    // If cancelled or payment failed, downgrade to free
    if (["CANCELLED", "DECLINED", "EXPIRED", "FROZEN"].includes(status)) {
      await db.shop.updateMany({
        where: { shop, subscriptionId },
        data: { plan: "free", subscriptionStatus: status },
      });
    }
  }

  return new Response();
};
