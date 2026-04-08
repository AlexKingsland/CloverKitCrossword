import { redirect } from "react-router";
import db from "../db.server";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
};

export async function requirePlan(
  shop: string,
  minimumPlan: "free" | "pro",
) {
  const shopRecord = await db.shop.findUnique({ where: { shop } });

  if (!shopRecord?.plan) {
    throw redirect("/app/pricing");
  }

  if (
    shopRecord.plan === "free" &&
    shopRecord.freeTrialEndsAt != null &&
    shopRecord.freeTrialEndsAt < new Date()
  ) {
    throw redirect("/app/pricing");
  }

  if ((PLAN_RANK[shopRecord.plan] ?? 0) < (PLAN_RANK[minimumPlan] ?? 0)) {
    throw redirect("/app/pricing");
  }

  return shopRecord;
}
