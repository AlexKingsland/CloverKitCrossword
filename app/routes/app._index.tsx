import { useState, useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopRecord = await prisma.shop.findUnique({
    where: { shop: session.shop },
  });

  let isThemeCompatible = true;
  try {
    const themeRes = await admin.graphql(`
      query {
        themes(first: 5, roles: [MAIN]) {
          nodes {
            files(filenames: ["templates/index.json"]) {
              nodes { filename }
            }
          }
        }
      }
    `);
    const themeData = await themeRes.json();
    const mainTheme = themeData.data?.themes?.nodes?.[0];
    isThemeCompatible = (mainTheme?.files?.nodes?.length ?? 0) > 0;
  } catch {
    // If the check fails, assume compatible rather than showing a false warning
    isThemeCompatible = true;
  }

  return {
    hasActivePlan: !!shopRecord?.plan,
    plan: shopRecord?.plan ?? null,
    shop: session.shop,
    isThemeCompatible,
  };
};

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e1e3e5",
        borderRadius: "12px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          background: "#f0faf7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: "15px", fontWeight: 600, color: "#202223" }}>{title}</div>
      <div style={{ fontSize: "14px", color: "#6d7175", lineHeight: 1.55 }}>{description}</div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: "#008060",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  );
}

function NoPlanModal({ onClose, onGoToPricing }: { onClose: () => void; onGoToPricing: () => void }) {
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
          maxWidth: "420px",
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#008060" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: "#202223" }}>
            One quick step to activate
          </div>
        </div>

        <p style={{ fontSize: "14px", color: "#6d7175", margin: "0 0 20px 0", lineHeight: 1.55 }}>
          CloverKit Crossword is free to use. Activate your free plan to add the crossword to your theme — no credit card required. Upgrade to Pro anytime to unlock analytics.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
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
            Cancel
          </button>
          <button
            onClick={onGoToPricing}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "none",
              background: "#008060",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Choose a plan →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { hasActivePlan, plan, shop, isThemeCompatible } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [showNoPlanModal, setShowNoPlanModal] = useState(false);
  const [marketingModal, setMarketingModal] = useState<{ open: false } | { open: true; shopEmail: string }>({ open: false });

  useEffect(() => {
    const shopEmail = sessionStorage.getItem("ck_marketing_modal");
    if (!shopEmail) return;
    sessionStorage.removeItem("ck_marketing_modal");
    const timer = setTimeout(() => setMarketingModal({ open: true, shopEmail }), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fetcher.state === "idle" && marketingModal.open) {
      navigate("/app");
    }
  }, [fetcher.state]);

  const handleAddToTheme = () => {
    if (!hasActivePlan) {
      setShowNoPlanModal(true);
      return;
    }
    const shopHandle = shop.replace(".myshopify.com", "");
    open(
      `https://admin.shopify.com/store/${shopHandle}/themes/current/editor`,
      "_top"
    );
  };

  return (
    <>
      {showNoPlanModal && (
        <NoPlanModal
          onClose={() => setShowNoPlanModal(false)}
          onGoToPricing={() => { setShowNoPlanModal(false); navigate("/app/pricing"); }}
        />
      )}

      {marketingModal.open && (
        <>
          <style>{`@keyframes ck-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, animation: "ck-fade-in 0.35s ease" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "28px 32px", maxWidth: "440px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#202223", marginBottom: "12px" }}>Stay in the loop</div>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: "0 0 18px 0", lineHeight: 1.5 }}>
                Would you like to receive product updates and tips from CloverKit? We'll send them to the email below.
              </p>
              <input
                type="email"
                defaultValue={marketingModal.shopEmail}
                id="ck-marketing-email"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #c9cccf", fontSize: "14px", marginBottom: "20px", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button onClick={() => { setMarketingModal({ open: false }); fetcher.submit({ intent: "skip_marketing" }, { method: "POST", action: "/app/pricing" }); }} style={{ padding: "8px 18px", borderRadius: "6px", border: "1px solid #c9cccf", background: "#fff", fontSize: "14px", cursor: "pointer", color: "#6d7175" }}>
                  No thanks
                </button>
                <button onClick={() => { const email = (document.getElementById("ck-marketing-email") as HTMLInputElement).value; setMarketingModal({ open: false }); fetcher.submit({ intent: "save_marketing", email }, { method: "POST", action: "/app/pricing" }); }} style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#008060", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                  Yes, keep me updated
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <s-page heading="">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, #004c3f 0%, #008060 60%, #00a37a 100%)",
            borderRadius: "16px",
            padding: "52px 48px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle decorative circles */}
          <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-60px", right: "120px", width: "280px", height: "280px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>🍀</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              CloverKit Crossword
            </span>
          </div>

          <div style={{ fontSize: "36px", fontWeight: 800, color: "#fff", lineHeight: 1.2, maxWidth: "520px" }}>
            Drive more customer engagement on your storefront
          </div>

          <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.8)", maxWidth: "480px", lineHeight: 1.6 }}>
            Embed a beautiful daily crossword puzzle in your store — keeping shoppers on your site longer and coming back every day.
          </div>

          <div style={{ marginTop: "8px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/app/pricing")}
              style={{
                padding: "11px 24px",
                background: "#fff",
                color: "#008060",
                borderRadius: "8px",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {hasActivePlan ? "Manage plan" : "Get started"}
            </button>
          </div>
        </div>

        {/* ── Plan status ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fff",
            border: "1px solid #e1e3e5",
            borderRadius: "10px",
            padding: "14px 20px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: hasActivePlan ? "#008060" : "#c9cccf",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "14px", color: "#202223" }}>
              {hasActivePlan
                ? <>Current plan: <strong>{plan === "pro" ? "Analytics" : "Free Forever"}</strong></>
                : "No plan selected"}
            </span>
          </div>
          <button
            onClick={() => navigate("/app/pricing")}
            style={{
              padding: "6px 14px",
              background: "#f0faf7",
              color: "#008060",
              border: "1px solid #b5e3d8",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {hasActivePlan ? (plan === "free" ? "Upgrade plan" : "Manage plan") : "Choose a plan"} →
          </button>
        </div>

        {/* ── Feature grid ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="9" height="9" rx="2" stroke="#008060" strokeWidth="2"/>
                <rect x="13" y="2" width="9" height="9" rx="2" stroke="#008060" strokeWidth="2"/>
                <rect x="2" y="13" width="9" height="9" rx="2" stroke="#008060" strokeWidth="2"/>
                <rect x="13" y="13" width="9" height="9" rx="2" stroke="#008060" strokeWidth="2"/>
              </svg>
            }
            title="Auto-generated Daily Puzzles"
            description="Fresh crossword puzzles are generated and published automatically every day — zero effort required on your end."
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            title="Engagement Analytics"
            description="Track puzzle starts, completions, and average solve time to understand how your customers interact with your store."
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="#008060" strokeWidth="2"/>
                <path d="M12 8v4l3 3" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            title="Daily Return Visits"
            description="A new puzzle every day gives customers a reason to come back — building a habit that keeps your store top of mind."
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20h9" stroke="#008060" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            title="Fully Customisable"
            description="Match your brand with a custom accent colour, puzzle title, and difficulty level — all editable from the theme editor."
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="#008060" strokeWidth="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18" stroke="#008060" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            }
            title="Mobile-Ready"
            description="A custom on-screen keyboard and responsive layout means customers can play comfortably on any device."
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            title="Zero Maintenance"
            description="Set it up once and forget it. Puzzles rotate automatically, no manual publishing or content updates needed."
          />
        </div>

        {/* ── Mission ───────────────────────────────────────────────────── */}
        <div
          style={{
            background: "#f6f6f7",
            borderRadius: "12px",
            padding: "36px 40px",
            marginBottom: "24px",
            display: "flex",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "56px", flexShrink: 0 }}>🧩</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#008060", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Our Mission
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#202223", lineHeight: 1.3 }}>
              Engagement that keeps customers coming back
            </div>
            <div style={{ fontSize: "14px", color: "#6d7175", lineHeight: 1.65, maxWidth: "560px" }}>
              We built CloverKit Crossword because we believe the best stores are the ones people look forward to visiting. A daily puzzle transforms your storefront from a place to buy into a place to be — turning one-time visitors into loyal regulars who return day after day.
            </div>
          </div>
        </div>

        {/* ── Theme compatibility warning ───────────────────────────────── */}
        {!isThemeCompatible && (
          <div
            style={{
              background: "#fff4e5",
              border: "1px solid #f5a623",
              borderRadius: "10px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "20px", flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#202223", marginBottom: "4px" }}>
                Your current theme may not support app blocks
              </div>
              <div style={{ fontSize: "14px", color: "#6d7175", lineHeight: 1.55 }}>
                CloverKit Crossword requires an Online Store 2.0 theme. Your active theme appears to use the legacy format.
                To use this app, switch to a 2.0-compatible theme such as Dawn, Craft, or Sense in your{" "}
                <a
                  href={`https://admin.shopify.com/store/${shop.replace(".myshopify.com", "")}/themes`}
                  target="_top"
                  style={{ color: "#008060", fontWeight: 600 }}
                >
                  theme library
                </a>.
              </div>
            </div>
          </div>
        )}

        {/* ── Getting started ───────────────────────────────────────────── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e1e3e5",
            borderRadius: "12px",
            padding: "32px 36px",
          }}
        >
          <div style={{ fontSize: "17px", fontWeight: 700, color: "#202223", marginBottom: "24px" }}>
            Get up and running in minutes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              plan === null
                ? {
                    n: 1,
                    title: "Choose a plan",
                    desc: "Select Free Forever to get started at no cost, or upgrade to Analytics to unlock engagement tracking.",
                    action: { label: "Go to pricing", onClick: () => navigate("/app/pricing") },
                  }
                : plan === "free"
                ? {
                    n: 1,
                    title: "You're on Free Forever",
                    desc: "Upgrade to Analytics anytime to unlock puzzle plays, completions, and engagement trends.",
                    action: { label: "Upgrade to Analytics", onClick: () => navigate("/app/pricing") },
                  }
                : {
                    n: 1,
                    title: "You're on Analytics",
                    desc: "You have full access to engagement tracking, completion rates, and historical trends.",
                    action: { label: "Manage plan", onClick: () => navigate("/app/pricing") },
                  },
              {
                n: 2,
                title: "Add the block to your theme",
                desc: 'Click below to open your theme editor. Click "Add section", scroll to the Apps section, and select "Crossword Puzzle".',
                action: { label: "Open theme editor", onClick: handleAddToTheme },
              },
              {
                n: 3,
                title: "Watch engagement grow",
                desc: "Customers see a fresh puzzle every day. Track plays and completions in the Analytics tab.",
                action: { label: "View analytics", onClick: () => navigate("/app/analytics") },
              },
            ].map((step) => (
              <div
                key={step.n}
                style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}
              >
                <StepBadge n={step.n} />
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "2px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#202223" }}>{step.title}</div>
                  <div style={{ fontSize: "14px", color: "#6d7175", lineHeight: 1.55 }}>{step.desc}</div>
                  <button
                    onClick={step.action.onClick}
                    style={{
                      marginTop: "6px",
                      alignSelf: "flex-start",
                      padding: "6px 14px",
                      background: "#f0faf7",
                      color: "#008060",
                      border: "1px solid #b5e3d8",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {step.action.label} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </s-page>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
