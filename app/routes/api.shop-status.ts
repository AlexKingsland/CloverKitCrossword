import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";

// ---------------------------------------------------------------------------
// In-memory rate limiter — fixed window, keyed by IP and by shop.
// The Maps are module-level so they persist across requests in the same
// server process. Entries are pruned on each request to avoid memory growth.
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipLimits = new Map<string, RateLimitEntry>();
const shopLimits = new Map<string, RateLimitEntry>();

const IP_LIMIT = 60;        // requests per IP per window
const SHOP_LIMIT = 120;     // requests per shop per window
const WINDOW_MS = 60_000;   // 1 minute

function isAllowed(map: Map<string, RateLimitEntry>, key: string, limit: number): boolean {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

function pruneExpired(map: Map<string, RateLimitEntry>) {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (now > entry.resetAt) map.delete(key);
  }
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

const rateLimitHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Prune stale entries occasionally (every request is fine at low traffic)
  pruneExpired(ipLimits);
  pruneExpired(shopLimits);

  const ip = getClientIp(request);

  if (!isAllowed(ipLimits, ip, IP_LIMIT)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: rateLimitHeaders,
    });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (shop && !isAllowed(shopLimits, shop, SHOP_LIMIT)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: rateLimitHeaders,
    });
  }

  if (!shop) {
    return new Response(JSON.stringify({ plan: null, hasAccess: false }), {
      headers: rateLimitHeaders,
    });
  }

  const shopRecord = await db.shop.findUnique({ where: { shop } });
  const plan = shopRecord?.plan ?? null;

  const freeTrialExpired =
    plan === "free" &&
    shopRecord?.freeTrialEndsAt != null &&
    shopRecord.freeTrialEndsAt < new Date();

  const hasAccess = plan !== null && !freeTrialExpired;
  const effectivePlan = freeTrialExpired ? null : plan;

  return new Response(JSON.stringify({ plan: effectivePlan, hasAccess }), {
    headers: rateLimitHeaders,
  });
};
