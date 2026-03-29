import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useFetcher, useNavigate } from "react-router";
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
  const plan = shopRecord?.plan ?? null;
  return {
    currentPlan: plan ?? "free",
    hasActivePlan: plan !== null,
    isPaidPlan: plan === "starter" || plan === "pro",
    plans: PLANS,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;
  const planId = formData.get("plan") as string;

  // ── Cancel subscription entirely ──────────────────────────────────────────
  if (intent === "cancel") {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop: session.shop },
    });
    if (shopRecord?.subscriptionId) {
      await admin.graphql(
        `#graphql
        mutation appSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription { id status }
            userErrors { field message }
          }
        }`,
        { variables: { id: shopRecord.subscriptionId } },
      );
    }
    await prisma.shop.update({
      where: { shop: session.shop },
      data: { plan: null, subscriptionId: null, subscriptionStatus: null, freeTrialEndsAt: null },
    });
    return redirect("/app/pricing");
  }

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return redirect("/app/pricing");

  // ── Downgrade to Free ─────────────────────────────────────────────────────
  if (plan.price === 0) {
    // Cancel any existing paid subscription first
    const shopRecord = await prisma.shop.findUnique({
      where: { shop: session.shop },
    });
    if (shopRecord?.subscriptionId) {
      await admin.graphql(
        `#graphql
        mutation appSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription { id status }
            userErrors { field message }
          }
        }`,
        { variables: { id: shopRecord.subscriptionId } },
      );
    }
    const freeTrialEndsAt = new Date();
    freeTrialEndsAt.setDate(freeTrialEndsAt.getDate() + 30);
    await prisma.shop.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, plan: "free", freeTrialEndsAt },
      update: { plan: "free", freeTrialEndsAt, subscriptionId: null, subscriptionStatus: null },
    });
    return redirect("/app");
  }

  // ── Upgrade / switch paid plan ────────────────────────────────────────────
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

  return { confirmationUrl: result.confirmationUrl };
};

// ── Helpers ────────────────────────────────────────────────────────────────

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2 };

function getLostPerks(fromPlanId: string, toPlanId: string | null): string[] {
  const from = PLANS.find((p) => p.id === fromPlanId);
  if (!from) return [];
  if (toPlanId === null) return from.features; // canceling entirely
  const to = PLANS.find((p) => p.id === toPlanId);
  if (!to) return from.features;
  return from.features.filter((f) => !to.features.includes(f));
}

// ── Confirmation modal ─────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; intent: "downgrade" | "cancel"; targetPlanId: string | null; lostPerks: string[] };

function ConfirmModal({
  state,
  onConfirm,
  onClose,
  isSubmitting,
}: {
  state: ModalState;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  if (!state.open) return null;

  const isCanceling = state.intent === "cancel";
  const targetName = state.targetPlanId
    ? PLANS.find((p) => p.id === state.targetPlanId)?.name
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "28px 32px",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#fff4f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#d92020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="#d92020" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="#d92020" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: "#202223" }}>
            {isCanceling ? "Cancel your subscription?" : `Downgrade to ${targetName}?`}
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: "14px", color: "#6d7175", margin: "0 0 18px 0", lineHeight: 1.5 }}>
          {isCanceling
            ? "Your subscription will be cancelled immediately. Your storefront crossword will be deactivated and customers won't be able to play."
            : `You'll move to the ${targetName} plan. You'll immediately lose access to the following features:`}
        </p>

        {/* Lost perks list */}
        {state.lostPerks.length > 0 && (
          <ul
            style={{
              margin: "0 0 20px 0",
              paddingLeft: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {state.lostPerks.map((perk) => (
              <li
                key={perk}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "#202223",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#d92020" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="#d92020" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="#d92020" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {perk}
              </li>
            ))}
            {isCanceling && (
              <li
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "#202223",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#d92020" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="#d92020" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="#d92020" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Storefront crossword deactivated
              </li>
            )}
          </ul>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "1px solid #c9cccf",
              background: "#fff",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              color: "#202223",
            }}
          >
            Keep my plan
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "none",
              background: "#d92020",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: isSubmitting ? "wait" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting
              ? "Processing…"
              : isCanceling
              ? "Yes, cancel subscription"
              : `Yes, downgrade to ${targetName}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────

export default function PricingPage() {
  const { currentPlan, hasActivePlan, isPaidPlan, plans } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalState>({ open: false });

  useEffect(() => {
    if (fetcher.data && "confirmationUrl" in fetcher.data) {
      open(fetcher.data.confirmationUrl as string, "_top");
    }
  }, [fetcher.data]);

  // Close modal once a non-redirect action resolves
  useEffect(() => {
    if (fetcher.state === "idle" && modal.open) {
      setModal({ open: false });
    }
  }, [fetcher.state]);

  const isSubmitting = fetcher.state !== "idle";

  const handlePlanClick = (planId: string) => {
    const isDowngrade = PLAN_RANK[planId] < PLAN_RANK[currentPlan];
    if (isDowngrade) {
      setModal({
        open: true,
        intent: "downgrade",
        targetPlanId: planId,
        lostPerks: getLostPerks(currentPlan, planId),
      });
    } else {
      fetcher.submit({ plan: planId }, { method: "POST" });
    }
  };

  const handleCancelClick = () => {
    setModal({
      open: true,
      intent: "cancel",
      targetPlanId: null,
      lostPerks: getLostPerks(currentPlan, null),
    });
  };

  const confirmModal = () => {
    if (!modal.open) return;
    if (modal.intent === "cancel") {
      fetcher.submit({ intent: "cancel" }, { method: "POST" });
    } else if (modal.targetPlanId) {
      fetcher.submit({ plan: modal.targetPlanId }, { method: "POST" });
    }
  };

  return (
    <>
      <ConfirmModal
        state={modal}
        onConfirm={confirmModal}
        onClose={() => setModal({ open: false })}
        isSubmitting={isSubmitting}
      />

      <s-page heading="Choose a plan">
        {hasActivePlan && (
          <div style={{ padding: "0 0 16px 0" }}>
            <s-button variant="tertiary" onClick={() => navigate("/app")}>
              ← Back
            </s-button>
          </div>
        )}

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
                  onClick={() => handlePlanClick(plan.id)}
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

        {/* Cancel subscription — only shown for paying customers */}
        {isPaidPlan && (
          <div
            style={{
              marginTop: "32px",
              paddingTop: "28px",
              borderTop: "1px solid #e1e3e5",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#8c9196" }}>
              Want to stop your subscription entirely?
            </p>
            <button
              onClick={handleCancelClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "9px 20px",
                borderRadius: "8px",
                border: "1.5px solid #fca5a5",
                background: "#fff5f5",
                color: "#b91c1c",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#f87171";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5";
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Cancel subscription
            </button>
          </div>
        )}
      </s-page>
    </>
  );
}
