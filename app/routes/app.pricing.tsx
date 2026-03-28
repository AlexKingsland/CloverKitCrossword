import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useSubmit } from "react-router";
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
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/callback`,
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

  // Persist the pending subscription id so the callback can find it
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

  return redirect(result.confirmationUrl);
};

export default function PricingPage() {
  const { currentPlan, plans } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const selectPlan = (planId: string) => {
    submit({ plan: planId }, { method: "POST" });
  };

  return (
    <s-page heading="Choose a plan">
      <s-layout columns="1-1-1">
        {plans.map((plan) => (
          <s-section key={plan.id} heading={plan.name}>
            <s-stack direction="block" gap="base">
              <s-text>
                {plan.price === 0 ? "Free" : `$${plan.price} / month`}
              </s-text>
              <s-paragraph>{plan.description}</s-paragraph>
              <s-unordered-list>
                {plan.features.map((f) => (
                  <s-list-item key={f}>{f}</s-list-item>
                ))}
              </s-unordered-list>
              {currentPlan === plan.id ? (
                <s-button disabled>Current plan</s-button>
              ) : (
                <s-button
                  variant="primary"
                  onClick={() => selectPlan(plan.id)}
                >
                  {plan.price === 0 ? "Downgrade to Free" : `Upgrade to ${plan.name}`}
                </s-button>
              )}
            </s-stack>
          </s-section>
        ))}
      </s-layout>
    </s-page>
  );
}
