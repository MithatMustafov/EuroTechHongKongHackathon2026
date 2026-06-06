# Payrouter — Full Handoff Document
**Project:** Payrouter (AI invoice-to-payment rail decision app)
**Repo:** https://github.com/MithatMustafov/EuroTechHongKongHackathon2026 · branch `TOTO` · folder `Frontend/`
**Local dev:** `/Users/toto/payrouter` · `npm run dev` → http://localhost:3100
**Date:** 2026-06-06

---

## 1. What the product does

Payrouter is a rebrand of the Onramper Swap site into a Hong Kong SME invoice-to-payment-rail decision layer. The user uploads (or picks) a supplier invoice; Payrouter scores fraud, runs compliance checks, recommends the safest payment rail (FPS / CHATS-RTGS / CIPS-RMB / SWIFT / HKD Stablecoin), and visually settles the payment before generating an audit receipt.

**One-line pitch:** Google Maps for SME payments — upload an invoice, get the safest route.

---

## 2. Everything built (complete, tested, pushed)

### 2.1 Marketing site (Onramper layout, rebranded)
| File | What it does |
|---|---|
| `app/layout.tsx` | Manrope font, Payrouter metadata |
| `app/globals.css` | Tailwind v4 theme tokens (bg, ink, muted, gradients), `animate-marquee`, `animate-blob` keyframes |
| `components/site/AnnouncementBar.tsx` | Top thin bar linking to /demo |
| `components/site/Nav.tsx` | Floating pill nav (logo / links / "Try demo" / "Get started" → all go to /demo) |
| `components/site/Hero.tsx` | Drifting gradient blobs, big H1, bullets, CTAs, inline widget |
| `components/site/Marquee.tsx` | Infinite rail marquee on purple→blue gradient band |
| `components/site/Features.tsx` | 4 alternating scroll-reveal sections (Fraud / Compliance / Rail routing / Receipts) with live animated mockups |
| `components/site/TrustBadges.tsx` | 3 trust cards (Audited / Secure / HK-Compliant) |
| `components/site/IntegrateTabs.tsx` | Two-tab (SME Dashboard / API) section with code snippet |
| `components/site/FAQ.tsx` | Accordion with 5 Payrouter-specific questions |
| `components/site/FooterCTA.tsx` | "Upload. Decide. Pay safely." dark panel |
| `components/site/Footer.tsx` | Minimal footer |
| `components/site/Logo.tsx` | SVG rail-node wordmark |
| `components/site/Reveal.tsx` | Framer Motion scroll-reveal wrapper |

### 2.2 Deterministic decision engine (8 unit tests)
| File | What it does |
|---|---|
| `lib/engine/types.ts` | All types: Invoice, Supplier, FraudResult, ComplianceResult, RailId, Decision |
| `lib/engine/signals.ts` | Derives raw boolean fraud signals from invoice + supplier |
| `lib/engine/fraud.ts` | Additive 0–100 fraud score + level + top reasons |
| `lib/engine/compliance.ts` | 6 compliance checks + stablecoin eligibility gate |
| `lib/engine/rails.ts` | Rail recommendation decision tree + per-rail status cards |
| `lib/engine/index.ts` | `analyze(invoice)` — full pipeline, returns `Decision` |
| `lib/engine/engine.test.ts` | 8 Vitest tests — all 4 sample invoices verified |
| `lib/data/sample_invoices.ts` | 4 sample invoices: fraud / FPS / stablecoin / CIPS-RMB |
| `lib/data/suppliers.ts` | Mock supplier registry |
| `lib/data/risky_wallets.ts` | Mock risk wallet list |
| `lib/data/sanctions_mock.ts` | Mock sanctions + restricted goods |

### 2.3 Decision widget (hero + /demo page)
| File | What it does |
|---|---|
| `components/widget/DecisionWidget.tsx` | Main state machine: select → analyzing → summary → payment → receipt + review (held) |
| `components/widget/FraudMeter.tsx` | Animated 0–100 bar + signal list |
| `components/widget/ComplianceChecklist.tsx` | 6-item compliance checklist with status icons |
| `components/widget/RailCard.tsx` | Per-rail recommendation card (Recommended/Available/Not suitable) |
| `app/demo/page.tsx` | Dedicated /demo route: bigger widget, "Route an invoice" heading, step strip |
| `app/api/extract/route.ts` | Optional invoice text extraction: heuristic parser (zero keys) + LLM if `ANTHROPIC_API_KEY` set |

### 2.4 On-chain HKD Stablecoin settlement (Sepolia)
| File | What it does |
|---|---|
| `contracts/HKDAP.sol` | Minimal ERC-20: name "HKD At Par (mock)", symbol HKDAP, owner-mintable |
| `scripts/compile-contract.mjs` | Compiles with solc → writes `lib/chain/hkdapArtifact.ts` |
| `lib/chain/hkdapArtifact.ts` | Auto-generated: ABI + bytecode (do not edit) |
| `lib/chain/hkdap.ts` | ethers v6: connect, ensureSepolia, deployAndMint, mint, transfer, getBalances |
| `components/widget/StablecoinSettlement.tsx` | 4-step live Sepolia flow: connect MetaMask → provision HKDAP → send transfer → verify; deploy-once-and-reuse via localStorage; graceful no-wallet fallback |
| `types/global.d.ts` | `window.ethereum` type declaration |

### 2.5 Per-rail settlement animations (FPS / CHATS / CIPS / SWIFT)
| File | What it does |
|---|---|
| `components/widget/RailSettlement.tsx` | Rail-accurate step-by-step settlement animation with from→to progress bar; realistic narratives per rail |

### 2.6 Email receipt + lead capture (IN PROGRESS — see §3)
| File | Status |
|---|---|
| `lib/receipt/generatePdf.ts` | **TO BUILD** — jspdf receipt generation |
| `app/api/receipt/send/route.ts` | **TO BUILD** — Resend: PDF attachment + contacts.create |
| `components/widget/ReceiptCapture.tsx` | **TO BUILD** — email gate, download + send, lead opt-in |
| `.env.local` (not committed) | **TO CONFIGURE** — see §4.1 |

---

## 3. What is still to be done

### 3.1 Receipt email + lead capture (assigned: Claude — in-session task)
**Spec:**
- After the receipt screen renders, show an email capture form before the PDF downloads.
- On submit: generate a PDF of the compliance receipt client-side (jspdf), POST to `/api/receipt/send`.
- Server route:
  1. Calls `resend.emails.send({ from, to: user_email, subject, html, attachments: [pdf_buffer] })` — delivers the receipt by email.
  2. Calls `resend.contacts.create({ audienceId: RESEND_AUDIENCE_ID, email, firstName: derived_from_email, unsubscribed: false })` — adds to marketing audience.
- Download button available immediately; send is a bonus, not a blocker.
- Keys needed: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_AUDIENCE_ID`.

### 3.2 Real API key setup (assigned: toto)
You need to:
1. Sign up at https://resend.com (free tier sends 100 emails/day).
2. Create an API key at https://resend.com/api-keys.
3. Create an audience at https://resend.com/audiences — copy the audience ID.
4. Verify a sender domain OR use `onboarding@resend.dev` for testing.
5. Create `/Users/toto/payrouter/.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   RESEND_FROM=receipt@yourdomain.com
   RESEND_AUDIENCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### 3.3 MetaMask live test (assigned: toto)
The Sepolia on-chain flow cannot be auto-tested without a real wallet. Steps:
1. Open http://localhost:3100/demo with MetaMask installed.
2. Get Sepolia ETH from https://sepoliafaucet.com.
3. Pick the "Stablecoin" sample invoice → Confirm payment → walk all 4 steps.
4. Verify the Etherscan link in the receipt is real.

### 3.4 Deployment to Vercel (assigned: toto or team)
```bash
npm i -g vercel
vercel link   # link to the team's Vercel project
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM
vercel env add RESEND_AUDIENCE_ID
vercel env add ANTHROPIC_API_KEY   # optional, for real invoice extraction
vercel deploy --prod
```
Note: the `contracts/` folder and `scripts/` are build-time only. The compiled artifact (`lib/chain/hkdapArtifact.ts`) is committed so no Solidity toolchain is needed on Vercel.

### 3.5 Resend domain verification (assigned: toto)
Without a verified domain, Resend forces `from: onboarding@resend.dev` which works for demos but shows the Resend brand. To send from `receipt@payrouter.xyz` (or similar), add the domain at https://resend.com/domains and set its DNS records.

### 3.6 Nice-to-haves (unassigned)
- Real PDF parsing via OCR (tesseract.js) so file-upload actually extracts text
- Mobile-responsive polish pass
- Real sanctions/KYC API integration (Chainalysis, Elliptic, etc.)
- Animated receipt PDF with Payrouter branding

---

## 4. Environment variables

| Variable | Required for | Default behavior without it |
|---|---|---|
| `RESEND_API_KEY` | Emailing the receipt | Receipt download still works locally; email send fails gracefully |
| `RESEND_FROM` | Sender address | Falls back to `onboarding@resend.dev` |
| `RESEND_AUDIENCE_ID` | Marketing lead storage in Resend | Contact creation is skipped |
| `ANTHROPIC_API_KEY` | Real invoice text extraction | Falls back to local heuristic parser |

Create `.env.local` in the project root (never commit this file — it's in `.gitignore`).

---

## 5. Running the project

```bash
cd Frontend          # or /Users/toto/payrouter
npm install
npm run dev          # → http://localhost:3100

npm test             # 8 engine unit tests
npm run compile:contract   # recompile HKDAP.sol → lib/chain/hkdapArtifact.ts
npm run build        # production typecheck + build
```

---

## 6. Git history (key commits on TOTO)

| Hash | What |
|---|---|
| `a49c5bd` | Design spec |
| `a4c1bb5` | Implementation plan |
| `e125939` | Next.js scaffold + deterministic engine (8 tests) |
| `7239d9f` | Full marketing site + decision widget UI |
| `2dd096b` | /demo page with larger widget |
| `f9c0eda` | Live on-chain stablecoin settlement + per-rail animations |
| *(next)* | Receipt email + lead capture |

---

## 7. Key design decisions (why, not what)

- **Deterministic engine, not LLM scoring:** ensures predictable hackathon demos and is more defensible in front of fintech judges.
- **Deploy-once-and-reuse HKDAP:** prevents multiple expensive deploy txs during a single demo session.
- **Resend Audience for leads:** purpose-built for email marketing — one API handles send + CRM.
- **No real payment integration:** explicitly out of scope per HKMA hackathon disclaimer; everything is visual/simulated except the testnet HKDAP transfer.
- **Saans → Manrope:** Saans is proprietary to Onramper; Manrope is a near-identical geometric sans under OFL.
