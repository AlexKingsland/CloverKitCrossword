import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Get started with one crossword puzzle",
    features: ["1 active puzzle", "Basic themes", "Community support"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 9.99,
    description: "Perfect for growing stores",
    features: [
      "10 active puzzles",
      "All themes",
      "Analytics",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29.99,
    description: "For stores that want it all",
    features: [
      "Unlimited puzzles",
      "Custom branding",
      "Priority support",
      "Advanced analytics",
    ],
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopRecord = await prisma.shop.findUnique({
    where: { shop: session.shop },
  });
  return { currentPlan: shopRecord?.plan ?? "free", plans: PLANS };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planId = formData.get("plan") as string;

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan || plan.price === 0) {
    return redirect("/app");
  }

  const response = await admin.graphql(
    `#graphql
    mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
      appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
        userErrors { field message }
        confirmationUrl
        appSubscription { id }
      }
    }`,
    {
      variables: {
        name: `CloverKit Crossword — ${plan.name}`,
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/callback?shop=${session.shop}`,
        test: process.env.NODE_ENV !== "production",
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: plan.price, currencyCode: "USD" },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    },
  );

  const data = await response.json();
  const result = data.data?.appSubscriptionCreate;

  if (result?.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  await prisma.shop.upsert({
    where: { shop: session.shop },
    create: {
      shop: session.shop,
      plan: "free",
      subscriptionId: result.appSubscription.id,
      subscriptionStatus: "pending",
    },
    update: {
      subscriptionId: result.appSubscription.id,
      subscriptionStatus: "pending",
    },
  });

  // Return the URL to the client — it must open at the top level to escape the iframe
  return { confirmationUrl: result.confirmationUrl };
};

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2 };

export default function PricingPage() {
  const { currentPlan, plans } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  useEffect(() => {
    if (fetcher.data && "confirmationUrl" in fetcher.data) {
      open(fetcher.data.confirmationUrl as string, "_top");
    }
  }, [fetcher.data]);

  const selectPlan = (planId: string) => {
    fetcher.submit({ plan: planId }, { method: "POST" });
  };

  return (
    <s-page heading="Choose a plan">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          padding: "16px 0",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              border: currentPlan === plan.id ? "2px solid #008060" : "1px solid #e1e3e5",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: currentPlan === plan.id ? "#f0faf7" : "#fff",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 600 }}>{plan.name}</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#202223" }}>
              {plan.price === 0 ? "Free" : `$${plan.price}`}
              {plan.price > 0 && (
                <span style={{ fontSize: "14px", fontWeight: 400, color: "#6d7175" }}>
                  {" "}/ month
                </span>
              )}
            </div>
            <div style={{ color: "#6d7175", fontSize: "14px" }}>{plan.description}</div>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#202223", fontSize: "14px", flexGrow: 1 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ marginBottom: "6px" }}>{f}</li>
              ))}
            </ul>
            {currentPlan === plan.id ? (
              <s-button disabled>Current plan</s-button>
            ) : (
              <s-button
                variant="primary"
                onClick={() => selectPlan(plan.id)}
              >
                {plan.price === 0
                  ? "Downgrade to Free"
                  : PLAN_RANK[plan.id] < PLAN_RANK[currentPlan]
                  ? `Downgrade to ${plan.name}`
                  : `Upgrade to ${plan.name}`}
              </s-button>
            )}
          </div>
        ))}
      </div>
    </s-page>
  );
}
