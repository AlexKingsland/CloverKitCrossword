import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const PLANS = [
  {
    id: "free",
    name: "Free",
    displayName: "FREE FOREVER",
    price: 0,
    description: "Get started at no cost",
    features: [
      "Daily puzzles, auto-published every 24h",
      "Professionally crafted, never repeated",
      "Frosted glass feature - expands on click",
      "Easy, medium, and hard difficulty levels",
      "Customize accent colors to your brand",
    ],
    excluded: ["Engagement analytics"],
  },
  {
    id: "pro",
    name: "Analytics",
    displayName: "ANALYTICS",
    price: 1.99,
    description: "For stores that want full visibility",
    features: [
      "Everything in Free",
      "Puzzle starts & completions tracking",
      "Completion rate & solve time metrics",
      "Historical trends & charts",
      "Priority support",
    ],
    excluded: [],
  },
];

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1 };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopRecord = await prisma.shop.findUnique({
    where: { shop: session.shop },
  });
  const plan = shopRecord?.plan ?? null;
  return {
    currentPlan: plan,
    plans: PLANS,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;
  const planId = formData.get("plan") as string;

  // ── Save marketing email ──────────────────────────────────────────────────
  if (intent === "save_marketing") {
    const email = (formData.get("email") as string | null)?.trim() || null;
    await prisma.shop.update({
      where: { shop: session.shop },
      data: { customerMarketingEmail: email },
    });
    return { redirectTo: "/app" };
  }

  // ── Skip marketing (just go home, plan already set) ───────────────────────
  if (intent === "skip_marketing") {
    return { redirectTo: "/app" };
  }

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return redirect("/app/pricing");

  // ── Select / downgrade to Free ────────────────────────────────────────────
  if (plan.price === 0) {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop: session.shop },
    });
    const isFirstTime = !shopRecord?.plan;

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
    await prisma.shop.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, plan: "free" },
      update: { plan: "free", freeTrialEndsAt: null, subscriptionId: null, subscriptionStatus: null },
    });

    if (isFirstTime) {
      const shopRes = await admin.graphql(`#graphql
        query { shop { email } }
      `);
      const shopData = await shopRes.json();
      const shopEmail: string = shopData.data?.shop?.email ?? "";
      return { showMarketingModal: true, shopEmail };
    }

    return { redirectTo: "/app" };
  }

  // ── Upgrade to Pro ────────────────────────────────────────────────────────
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

function getLostPerks(fromPlanId: string, toPlanId: string): string[] {
  const from = PLANS.find((p) => p.id === fromPlanId);
  const to = PLANS.find((p) => p.id === toPlanId);
  if (!from || !to) return [];
  return from.features.filter((f) => !to.features.includes(f));
}

// ── Confirmation modal ─────────────────────────────────────────────────────

type ModalState =
  | { open: false }
  | { open: true; targetPlanId: string; lostPerks: string[] };

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

  const targetName = PLANS.find((p) => p.id === state.targetPlanId)?.name;

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
            Downgrade to {targetName}?
          </div>
        </div>

        <p style={{ fontSize: "14px", color: "#6d7175", margin: "0 0 18px 0", lineHeight: 1.5 }}>
          You'll move to the {targetName} plan and immediately lose access to:
        </p>

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
          </ul>
        )}

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
            {isSubmitting ? "Processing…" : `Yes, downgrade to ${targetName}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Marketing opt-in modal ─────────────────────────────────────────────────

function MarketingModal({
  shopEmail,
  onOptIn,
  onSkip,
  isSubmitting,
}: {
  shopEmail: string;
  onOptIn: (email: string) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}) {
  const [email, setEmail] = useState(shopEmail);

  return (
    <>
      <style>{`@keyframes ck-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "ck-fade-in 0.35s ease",
      }}
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#f0faf7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22,6 12,13 2,6" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: "#202223" }}>
            Stay in the loop
          </div>
        </div>

        <p style={{ fontSize: "14px", color: "#6d7175", margin: "0 0 18px 0", lineHeight: 1.5 }}>
          Would you like to receive product updates and tips from CloverKit? We'll send them to the email below — you can change it if you'd prefer a different address.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#202223", marginBottom: "6px" }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #c9cccf",
              fontSize: "14px",
              color: "#202223",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onSkip}
            disabled={isSubmitting}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "1px solid #c9cccf",
              background: "#fff",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              color: "#6d7175",
            }}
          >
            No thanks
          </button>
          <button
            onClick={() => onOptIn(email)}
            disabled={isSubmitting || !email.trim()}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "none",
              background: "#008060",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: isSubmitting ? "wait" : "pointer",
              opacity: isSubmitting || !email.trim() ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Saving…" : "Yes, keep me updated"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Page component ─────────────────────────────────────────────────────────

export default function PricingPage() {
  const { currentPlan, plans } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [marketingModal, setMarketingModal] = useState<{ open: false } | { open: true; shopEmail: string }>({ open: false });

  useEffect(() => {
    if (fetcher.data && "confirmationUrl" in fetcher.data) {
      open(fetcher.data.confirmationUrl as string, "_top");
    }
    if (fetcher.data && "showMarketingModal" in fetcher.data) {
      const shopEmail = (fetcher.data as { shopEmail: string }).shopEmail;
      sessionStorage.setItem("ck_marketing_modal", shopEmail);
      navigate("/app");
    }
    if (fetcher.data && "redirectTo" in fetcher.data) {
      navigate(fetcher.data.redirectTo as string);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (fetcher.state === "idle" && modal.open) {
      setModal({ open: false });
    }
    if (fetcher.state === "idle" && marketingModal.open) {
      navigate("/app");
    }
  }, [fetcher.state]);

  const isSubmitting = fetcher.state !== "idle";

  const handlePlanClick = (planId: string) => {
    if (currentPlan === null) {
      // First-time selection — no confirmation needed
      fetcher.submit({ plan: planId }, { method: "POST" });
      return;
    }
    const isDowngrade = PLAN_RANK[planId] < PLAN_RANK[currentPlan];
    if (isDowngrade) {
      setModal({
        open: true,
        targetPlanId: planId,
        lostPerks: getLostPerks(currentPlan, planId),
      });
    } else {
      fetcher.submit({ plan: planId }, { method: "POST" });
    }
  };

  const confirmModal = () => {
    if (!modal.open) return;
    if (modal.targetPlanId) {
      fetcher.submit({ plan: modal.targetPlanId }, { method: "POST" });
    }
  };

  const noPlan = currentPlan === null;

  return (
    <>
      <ConfirmModal
        state={modal}
        onConfirm={confirmModal}
        onClose={() => setModal({ open: false })}
        isSubmitting={isSubmitting}
      />

      {marketingModal.open && (
        <MarketingModal
          shopEmail={marketingModal.shopEmail}
          onOptIn={(email) => {
            fetcher.submit({ intent: "save_marketing", email }, { method: "POST" });
          }}
          onSkip={() => {
            fetcher.submit({ intent: "skip_marketing" }, { method: "POST" });
          }}
          isSubmitting={isSubmitting}
        />
      )}

      <s-page heading="Choose a plan">
        {!noPlan && (
          <div style={{ padding: "0 0 16px 0" }}>
            <s-button variant="tertiary" onClick={() => navigate("/app")}>
              ← Back
            </s-button>
          </div>
        )}

        {noPlan && (
          <p style={{ fontSize: "14px", color: "#6d7175", margin: "0 0 24px 0" }}>
            Select a plan to activate your storefront crossword. You can change or cancel at any time.
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
            maxWidth: "720px",
            padding: "4px 0 24px",
          }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isUpgrade = currentPlan !== null && PLAN_RANK[plan.id] > PLAN_RANK[currentPlan];
            const isDowngrade = currentPlan !== null && PLAN_RANK[plan.id] < PLAN_RANK[currentPlan];

            let buttonLabel: string;
            if (isCurrent) {
              buttonLabel = "Current plan";
            } else if (noPlan) {
              buttonLabel = `Select ${plan.name}`;
            } else if (isUpgrade) {
              buttonLabel = `Upgrade to ${plan.name}`;
            } else if (isDowngrade) {
              buttonLabel = `Downgrade to ${plan.name}`;
            } else {
              buttonLabel = `Select ${plan.name}`;
            }

            return (
              <div
                key={plan.id}
                style={{
                  border: isCurrent ? "2px solid #008060" : "1px solid #e1e3e5",
                  borderRadius: "12px",
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  background: isCurrent ? "#f0faf7" : "#fff",
                  position: "relative",
                }}
              >
                {plan.id === "pro" && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-1px",
                      right: "20px",
                      background: "#4a8e8e",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "3px 10px",
                      borderRadius: "0 0 6px 6px",
                    }}
                  >
                    Professional
                  </div>
                )}

                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "#8c9196", textTransform: "uppercase" }}>{plan.displayName}</div>

                <div style={{ fontSize: "28px", fontWeight: 800, color: "#202223" }}>
                  {plan.price === 0 ? "$0" : `$${plan.price}`}
                  <span style={{ fontSize: "14px", fontWeight: 400, color: "#6d7175" }}>
                    /mo
                  </span>
                </div>

                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", color: "#202223" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <polyline points="20 6 9 17 4 12" stroke="#008060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", color: "#8c9196" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <line x1="18" y1="6" x2="6" y2="18" stroke="#c9cccf" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="#c9cccf" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <s-button disabled>{buttonLabel}</s-button>
                ) : (
                  <s-button
                    variant={plan.id === "pro" && !isDowngrade ? "primary" : "secondary"}
                    onClick={() => handlePlanClick(plan.id)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing…" : buttonLabel}
                  </s-button>
                )}
              </div>
            );
          })}
        </div>

      </s-page>
    </>
  );
}
