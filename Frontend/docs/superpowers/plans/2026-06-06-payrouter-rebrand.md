# Payrouter Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Onramper Swap site into "Payrouter" — preserving its layout/animations — with a working invoice→fraud/compliance→rail-decision widget.

**Architecture:** Next.js App Router single-page marketing site composed of section components, plus a client-side `DecisionWidget` state machine. A pure-TypeScript deterministic engine (fraud/compliance/rails) drives decisions; an optional `/api/extract` route adds LLM field extraction when a key exists.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Vitest for engine tests.

---

## File structure

```
payrouter/
  app/{layout.tsx,page.tsx,globals.css,api/extract/route.ts}
  components/site/{AnnouncementBar,Nav,Hero,Marquee,FeatureSection,TrustBadges,IntegrateTabs,FAQ,FooterCTA,Footer}.tsx
  components/widget/{DecisionWidget,SelectStep,AnalyzingStep,SummaryStep,PaymentStep,ReceiptStep,FraudMeter,ComplianceChecklist,RailCard}.tsx
  components/ui/*                      # shadcn primitives
  lib/engine/{types.ts,fraud.ts,compliance.ts,rails.ts,index.ts}
  lib/data/{sample_invoices.ts,suppliers.ts,risky_wallets.ts,sanctions_mock.ts,rail_rules.ts}
  lib/engine/*.test.ts
```

---

## Phase 0 — Scaffold

### Task 0: Project scaffold
- [ ] Create Next.js + TS + Tailwind app in `payrouter/` (App Router, src-less, import alias `@/*`).
- [ ] Add deps: `framer-motion`, `clsx`, `tailwind-merge`, `lucide-react`; dev: `vitest`.
- [ ] Init shadcn/ui; add `button`, `card`, `tabs`, `accordion`, `badge`, `progress`.
- [ ] Configure fonts via `next/font` (geometric sans: Satoshi/General Sans local or a Google fallback like `Manrope`), Arial fallback.
- [ ] Tailwind theme tokens: bg `#efeef3`, ink `#151515`, muted `#929292`, brand accents (indigo/teal), pill radius.
- [ ] Verify: `npm run dev` serves a blank page; commit.

---

## Phase 1 — Deterministic engine (TDD)

### Task 1: Engine types
- [ ] Create `lib/engine/types.ts`: `Invoice`, `Supplier`, `FraudResult`, `ComplianceResult`,
      `RailId` (`'FPS'|'CHATS_RTGS'|'CIPS_RMB'|'SWIFT'|'HKD_STABLECOIN'|'HOLD_OR_BLOCK'`),
      `RailOption`, `Decision`, matching spec §4–5 and brief §24 output shape.
- [ ] Commit.

### Task 2: Fraud scoring (TDD)
- [ ] `lib/engine/fraud.test.ts`: low-risk clean invoice → score ≤30 `low`; fraudulent
      (wallet changed + urgency + domain mismatch + new large beneficiary) → ≥86 `critical`;
      `sanctionsHit` forces 100.
- [ ] Run, see fail.
- [ ] Implement `scoreFraud(invoice, supplier, signals)` per spec §5 additive rules + `min(.,100)` + level mapping.
- [ ] Run, see pass. Commit.

### Task 3: Compliance checks (TDD)
- [ ] `lib/engine/compliance.test.ts`: clean invoice → all pass + `stablecoin_eligible` per 8-point gate;
      sanctioned supplier → sanctions fail + overall fail; restricted goods → enhanced-review flag.
- [ ] Run, see fail.
- [ ] Implement `checkCompliance(invoice, supplier)`. Run, see pass. Commit.

### Task 4: Rail recommendation (TDD)
- [ ] `lib/engine/rails.test.ts`: the four sample invoices → FPS / CHATS_RTGS-or-FPS / CIPS_RMB /
      HKD_STABLECOIN / HOLD_OR_BLOCK exactly per spec §5 decision tree, with per-rail statuses+reasons.
- [ ] Run, see fail.
- [ ] Implement `recommendRail(invoice, fraud, compliance, supplier)` + `buildRailOptions(...)`. Run, see pass. Commit.

### Task 5: Engine orchestrator (TDD)
- [ ] `lib/engine/index.test.ts`: `analyze(invoice, supplier)` returns full `Decision` for each sample
      invoice matching brief expected outcomes.
- [ ] Run, see fail.
- [ ] Implement `analyze(...)` composing fraud→compliance→rails. Run, see pass. Commit.

### Task 6: Mock data + sample invoices
- [ ] Create `lib/data/*` (suppliers, risky_wallets, sanctions_mock, rail_rules) and
      `sample_invoices.ts` with the 4 invoices from spec §7 (fraud / local FPS / stablecoin / RMB).
- [ ] Add a test asserting each sample, run through `analyze`, yields its documented outcome. Commit.

---

## Phase 2 — Marketing site shell (build + visual verify)

### Task 7: Layout, theme, globals
- [ ] `app/layout.tsx` (font, metadata "Payrouter", bg) + `globals.css` (gradient blob utilities,
      marquee keyframes, scroll-reveal helpers).
- [ ] `app/page.tsx` renders section components in order (stubs first). Verify dev server. Commit.

### Task 8: AnnouncementBar + Nav
- [ ] Thin announcement bar; floating sticky pill nav (logo pill / links pill / "Try Widget" + "Get started").
      Smooth-scroll links. Verify visually. Commit.

### Task 9: Hero
- [ ] Headline/subcopy/3 bullets/CTA (left) + slot for `DecisionWidget` (right) + drifting gradient blobs.
      Framer Motion entrance. Verify. Commit.

### Task 10: Marquee
- [ ] Infinite horizontal rail marquee (FPS·CHATS/RTGS·CIPS/RMB·SWIFT·HKD Stablecoin·HKMA) on purple→blue band. Verify. Commit.

### Task 11: Feature sections
- [ ] Alternating `FeatureSection` blocks: Fraud detection / Compliance engine / Smart rail routing / Audit receipts,
      with scroll-reveal and a stylized animated mockup panel each. Verify. Commit.

### Task 12: TrustBadges + IntegrateTabs + FAQ + FooterCTA + Footer
- [ ] Three trust cards (Audited/Secure/HK-Compliant); two-tab "Integrate effortlessly"; FAQ accordion
      (rails, stablecoin regime, fraud, compliance, data); "Upload. Decide. Pay safely." footer CTA; footer. Verify. Commit.

---

## Phase 3 — Decision widget (build + visual verify)

### Task 13: Widget shell + Select step
- [ ] `DecisionWidget` state machine (`select|analyzing|summary|payment|receipt`) with Framer Motion
      transitions; `SelectStep` shows the 4 sample invoices as cards + an "Upload invoice" affordance. Verify. Commit.

### Task 14: Analyzing step
- [ ] Animated multi-step loader cycling spec §4 lines, each ticking complete, then advances to summary
      using `analyze(selectedInvoice, supplier)`. Verify. Commit.

### Task 15: Summary step
- [ ] `FraudMeter` (animated 0–100), `ComplianceChecklist`, extracted-details panel, `RailCard` list
      (Recommended/Available/Not suitable), primary action (Confirm / Create review case). Verify. Commit.

### Task 16: Payment + Receipt steps
- [ ] `PaymentStep` visual completion ("Processing via {rail} → initiated → receipt"), simulated tx ref for stablecoin;
      `ReceiptStep` audit receipt summary. "Held" path routes to review-case view instead. Verify. Commit.

---

## Phase 4 — Optional LLM upload

### Task 17: Extract route + upload wiring
- [ ] `app/api/extract/route.ts`: if provider key present, call LLM to extract structured invoice fields
      (extraction only); else return `{ fallback: true }`. Feed extracted fields into the SAME `analyze` engine.
- [ ] `SelectStep` upload: textarea/file → POST → on success run engine; on fallback nudge to samples. Verify. Commit.

---

## Self-review notes
- Spec coverage: §2 layout→Tasks 7–12; §3 mapping→Tasks 8–12; §4 widget→Tasks 13–16; §5 engine→Tasks 1–6;
  §6 LLM→Task 17; §7 samples→Task 6. No gaps.
- Engine names are fixed in Task 1 types and reused verbatim (`analyze`, `scoreFraud`, `checkCompliance`,
  `recommendRail`, `buildRailOptions`).
- Visual tasks verified by running the dev server and inspecting; engine tasks verified by Vitest.
