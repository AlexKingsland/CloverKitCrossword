import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=60",
    "Content-Type": "application/json",
  };

  if (!shop) {
    return new Response(JSON.stringify({ plan: null, hasAccess: false }), { headers });
  }

  const shopRecord = await db.shop.findUnique({ where: { shop } });
  const plan = shopRecord?.plan ?? null;

  const freeTrialExpired =
    plan === "free" &&
    shopRecord?.freeTrialEndsAt != null &&
    shopRecord.freeTrialEndsAt < new Date();

  const hasAccess = plan !== null && !freeTrialExpired;
  const effectivePlan = freeTrialExpired ? null : plan;

  return new Response(JSON.stringify({ plan: effectivePlan, hasAccess }), { headers });
};
