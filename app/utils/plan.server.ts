import { redirect } from "react-router";
import db from "../db.server";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

export async function requirePlan(
  shop: string,
  minimumPlan: "free" | "starter" | "pro",
) {
  const shopRecord = await db.shop.findUnique({ where: { shop } });
  const currentPlan = shopRecord?.plan ?? "free";

  if ((PLAN_RANK[currentPlan] ?? 0) < (PLAN_RANK[minimumPlan] ?? 0)) {
    throw redirect("/app/pricing");
  }

  return shopRecord;
}
