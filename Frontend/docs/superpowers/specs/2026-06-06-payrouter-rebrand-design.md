# Payrouter — Design Spec

**Date:** 2026-06-06
**Status:** Draft for review
**Owner:** toto

## 1. Overview

Payrouter is a rebrand of the **Onramper Swap** marketing site + product widget, repurposed
to deliver the **RailGuard HK** concept: an AI decision layer that turns an uploaded supplier
invoice into a safe, compliant, payment-ready decision for Hong Kong SMEs.

We **preserve Onramper's layout and animation language verbatim** and change only what the
new brand and product require: copy, palette accents, the partner marquee, the feature
sections, the FAQ, and — most importantly — the hero **swap widget**, which becomes the
**Payrouter decision widget** (invoice → fraud/compliance analysis → rail recommendation →
visual payment → receipt).

Brand name across all UI: **Payrouter** (the "RailGuard HK" brief is the underlying concept only).

### Goals
- A polished, demo-ready single-page marketing site that looks and animates like Onramper.
- A working, self-contained decision widget covering the full flow from the brief.
- Fully reliable in a live demo (deterministic engine, no required network calls).

### Non-goals
- Real payment execution (FPS/CHATS/CIPS/SWIFT/stablecoin) — visualized only.
- Real sanctions/KYC APIs — mocked.
- Real stablecoin issuance or on-chain transactions — simulated hash only.
- Auth, multi-user, persistence/database.

## 2. Preserved design language (from Onramper Swap)

Captured live from https://onramper.com/products/swap on 2026-06-06.

- **Typography:** Saans (geometric sans), fallback `Arial, sans-serif`. Huge bold near-black
  headlines (`#151515`/`#111`), gray subcopy (`#929292`/`#808099`).
- **Page background:** light lilac `#efeef3`; white content sections.
- **Gradients:** soft pastel blobs — lilac→peach in the hero, purple→blue band behind the
  partner marquee. Slow drifting/floating motion.
- **Floating pill nav (sticky):** separate pills for logo, nav links, and the two CTAs
  ("Try Widget" light pill + "Get started" black pill).
- **Buttons:** black pill primary, light-lilac pill secondary, fully rounded.
- **Animations to reproduce:** drifting gradient blobs; horizontal logo **marquee** loop;
  scroll-reveal (fade/slide-up) on sections; animated counters/transitions inside the widget;
  autoplaying looped product mockups in feature blocks.

### Page skeleton (kept 1:1 with Onramper)
1. Announcement bar (thin, top)
2. Floating pill nav
3. Hero — headline + subcopy + 3 check bullets + CTA (left); **live widget** (right); gradient bg
4. Partner **marquee** band (purple→blue gradient)
5. Alternating feature sections (text + animated mockup)
6. "Built by the best" trust badges row (three cards)
7. "Integrate effortlessly" — two-tab section
8. FAQ accordion
9. Big footer CTA panel
10. Footer

## 3. Brand & content mapping

| Onramper | Payrouter |
|---|---|
| "Effortless cross-chain swaps" (H1) | "The decision layer before money moves" |
| Crypto-liquidity subcopy | "Upload a supplier invoice. Payrouter detects fraud, checks compliance, and routes it to the safest Hong Kong payment rail — before money moves." |
| 3 bullets (tokens/networks/plug-play) | "Fraud-checked before payment" · "Compliance built in (FPS, CHATS, CIPS, SWIFT, stablecoin)" · "Audit-ready receipts" |
| Swap widget | **Decision widget** (see §4) |
| Wallet/exchange logo marquee | Rail marquee: FPS · CHATS/RTGS · CIPS/RMB · SWIFT · HKD Stablecoin · HKMA |
| Feature: liquidity / revenue / enterprise | Feature: Fraud detection · Compliance engine · Smart rail routing · Audit receipts |
| Trust badges: Audited / Secure / Compliant | Audited · Secure · HK-Compliant (HKMA framing) |
| FAQ (crypto) | FAQ: rails, HK stablecoin regime, fraud detection, compliance, data |
| "Plug. Play. Prosper." | "Upload. Decide. Pay safely." |

Tone: trustworthy HK SME fintech. Keep the pastel aesthetic; nudge accents slightly toward a
confident fintech feel (deeper indigo/teal accents allowed) while keeping the gradients and
layout intact.

## 4. The decision widget (hero centerpiece)

Replaces Onramper's swap card. A self-contained client component with animated state machine.

### States
1. **Select** — choose one of the bundled sample invoices (cards/tabs), or "Upload invoice"
   (optional LLM path, §6). Mirrors Onramper's send/get card framing.
2. **Analyzing** — animated multi-step loader cycling the brief's lines: "Extracting invoice
   details… Checking supplier identity… Scanning for fraud patterns… Running compliance
   checks… Comparing payment rails…" (each step ticks complete).
3. **Summary** — single screen with sections from the brief:
   - Extracted invoice details
   - Fraud risk (animated 0–100 meter + signal list)
   - Compliance checklist (KYC/KYB/sanctions/jurisdiction/goods/amount)
   - Rail recommendation cards (FPS / CHATS-RTGS / CIPS-RMB / SWIFT / HKD Stablecoin) with
     status: Recommended / Available / Not suitable, each with a reason
   - Primary action: "Confirm payment" or, when held, "Create review case"
4. **Payment** — visual completion: "Processing via {rail} → Payment initiated → Receipt
   generated"; stablecoin shows a simulated tx reference (`0xA92…F31`).
5. **Receipt** — audit-ready receipt summary (invoice, risk, compliance, rail, confirmation).

All transitions use Framer Motion to echo the widget's animated feel.

## 5. Mock decision engine (deterministic)

Pure TS module, ported from the brief (§15–16). No network required.

### Fraud score
```
risk = 0
+15 newSupplier; +15 amountUnusual; +30 paymentDestinationChanged;
+25 walletOrAccountNotVerified; +20 urgencyDetected; +15 pressureLanguageDetected;
+25 emailDomainMismatch; +40 walletOnRiskList; sanctionsHit => risk = 100
risk = min(risk, 100)
```
Levels: 0–30 Low (approve) · 31–60 Medium (confirm) · 61–85 High (manual) · 86–100 Critical (hold/block).

### Compliance checks
Boolean/status for: payer KYC, supplier KYB, sanctions, jurisdiction, goods category,
amount/policy limit, stablecoin eligibility (8-point gate from brief §10.7).

### Rail recommendation
```
if fraud >= 86 || sanctionsHit            -> HOLD_OR_BLOCK
if HK & amount < 100000 & HKD             -> FPS
if HK & amount >= 100000                  -> CHATS_RTGS
if Mainland China & RMB                   -> CIPS_RMB
if verifiedStablecoinWallet & HKD &
   fraud <= 30 & compliancePassed &
   amount <= stablecoinLimit              -> HKD_STABLECOIN
else                                      -> SWIFT
```
Engine returns: extracted invoice, fraud result, compliance result, recommended rail +
per-rail status/reasons, decision/action. Shape matches brief §24 example API output.

## 6. Optional LLM upload path

- Default demo path = sample invoices + deterministic engine (no key needed).
- If `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` (or configured provider) is present, the "Upload
  invoice" action POSTs the file/text to a Next.js route handler that calls the LLM to
  **extract structured fields only** (supplier, country, amount, currency, goods, due date,
  destination, urgency/changed-details flags).
- Extracted fields then flow through the **same deterministic** fraud/compliance/rail engine —
  the LLM never decides scoring or routing (keeps demo predictable, per brief §17).
- No key present → upload gracefully falls back to a "paste invoice text" textarea parsed by a
  lightweight local heuristic, or nudges the user to the sample invoices.

## 7. Sample invoices (bundled)

From brief §13:
1. **Fraudulent** — Berlin Components GmbH, HKD 42,000, wallet changed + urgency → Hold (≈91).
2. **Local HK** — Kowloon Office Supplies, HKD 8,500, FPS ID → FPS (low risk).
3. **Clean international + stablecoin** — Berlin Components GmbH, HKD 42,000, verified wallet → HKD Stablecoin.
4. **Mainland RMB** — Shenzhen Precision Manufacturing, RMB 200,000 → CIPS/RMB.

Plus mock data files: `suppliers.json`, `risky_wallets.json`, `sanctions_mock.json`,
`rail_rules.json`, `sample_invoices.json`.

## 8. Tech stack & structure

- **Next.js (App Router) + TypeScript**, **Tailwind CSS**, **Framer Motion**, **shadcn/ui**.
- Saans via self-hosted/`next/font` (fallback Arial) — license-safe alternative if Saans is
  unavailable; otherwise a close geometric sans (e.g. General Sans / Satoshi).

```
payrouter/
  app/
    layout.tsx            # font, metadata, base bg
    page.tsx              # composes all sections
    api/extract/route.ts  # optional LLM extraction
  components/
    site/                 # AnnouncementBar, Nav, Hero, Marquee, FeatureSection,
                          #   TrustBadges, IntegrateTabs, FAQ, FooterCTA, Footer
    widget/               # DecisionWidget + Select/Analyzing/Summary/Payment/Receipt,
                          #   FraudMeter, ComplianceChecklist, RailCard
    ui/                   # shadcn primitives
  lib/
    engine/               # fraud.ts, compliance.ts, rails.ts, types.ts
    data/                 # the mock JSON files
  docs/superpowers/specs/ # this spec + plan
```

## 9. Success criteria
- Site visually reads as the Onramper layout with all named animations working.
- All four sample invoices produce the brief's expected outcomes through the widget flow.
- Receipt renders for confirmed payments; held payments show reasons + review action.
- `npm run dev` works with zero env vars; optional upload activates only when a key is set.
