import { describe, it, expect } from "vitest";
import { analyze, scoreFraud, checkCompliance } from "./index";
import { SAMPLE_INVOICES } from "@/lib/data/sample_invoices";
import type { Invoice } from "./types";

const byId = (id: string): Invoice => {
  const inv = SAMPLE_INVOICES.find((i) => i.id === id);
  if (!inv) throw new Error(`missing sample ${id}`);
  return inv;
};

describe("fraud scoring", () => {
  it("scores the clean cross-border invoice as low risk", () => {
    const r = scoreFraud(byId("clean-stablecoin"));
    expect(r.score).toBeLessThanOrEqual(30);
    expect(r.level).toBe("low");
  });

  it("scores the redirection-fraud invoice as critical", () => {
    const r = scoreFraud(byId("fraud-redirect"));
    expect(r.score).toBeGreaterThanOrEqual(86);
    expect(r.level).toBe("critical");
  });
});

describe("compliance", () => {
  it("passes for the clean invoice and marks stablecoin eligible", () => {
    const r = checkCompliance(byId("clean-stablecoin"));
    expect(r.status).toBe("passed");
    expect(r.stablecoinEligible).toBe(true);
  });

  it("flags restricted goods for enhanced review", () => {
    const inv = { ...byId("local-fps"), goods: "Dual-use encryption modules" };
    const r = checkCompliance(inv);
    expect(r.checks.find((c) => c.key === "goods_category")?.status).toBe("review");
  });
});

describe("full decision per sample invoice", () => {
  it("holds the fraudulent invoice", () => {
    const d = analyze(byId("fraud-redirect"));
    expect(d.recommendedRail).toBe("HOLD_OR_BLOCK");
    expect(d.action).toBe("hold_payment");
  });

  it("routes the local HK invoice to FPS", () => {
    const d = analyze(byId("local-fps"));
    expect(d.recommendedRail).toBe("FPS");
    expect(d.action).toBe("confirm_payment");
  });

  it("routes the clean cross-border invoice to HKD stablecoin", () => {
    const d = analyze(byId("clean-stablecoin"));
    expect(d.recommendedRail).toBe("HKD_STABLECOIN");
    expect(d.rails.find((r) => r.rail === "SWIFT")?.status).toBe("available");
  });

  it("routes the Mainland RMB invoice to CIPS/RMB", () => {
    const d = analyze(byId("mainland-rmb"));
    expect(d.recommendedRail).toBe("CIPS_RMB");
  });
});
