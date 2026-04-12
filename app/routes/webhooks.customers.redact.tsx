import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // CloverKit Crossword does not store personally identifiable customer data
  // in its database. Session records contain only merchant (store owner) data.
  // Customer interaction events (puzzle starts/completions) are stored in
  // PostHog and are tagged with the shop domain only — no customer identifiers
  // (name, email, customer ID) are ever sent to or stored by this app.
  //
  // There is no customer-specific data to redact. We acknowledge the request
  // and return 200 OK as required by Shopify.

  const redactRequest = payload as {
    customer: { id: number; email: string };
    orders_to_redact: number[];
  };

  console.log(
    `Redact request for customer ${redactRequest?.customer?.id} at ${shop}: no customer data held by this app.`
  );

  return new Response();
};
