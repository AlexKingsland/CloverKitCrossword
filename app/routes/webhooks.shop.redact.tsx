import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // shop/redact fires 48 hours after a merchant uninstalls the app.
  // At this point we must permanently delete all data associated with the shop.
  // Note: session records are also deleted by the app/uninstalled webhook, but
  // we delete them here too in case that earlier webhook was missed.

  try {
    await db.session.deleteMany({ where: { shop } });
    console.log(`Deleted sessions for ${shop}`);
  } catch (error) {
    console.error(`Failed to delete sessions for ${shop}:`, error);
  }

  try {
    await db.shop.deleteMany({ where: { shop } });
    console.log(`Deleted shop record for ${shop}`);
  } catch (error) {
    console.error(`Failed to delete shop record for ${shop}:`, error);
  }

  return new Response();
};
