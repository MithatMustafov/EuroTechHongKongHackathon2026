# HONESTY.md

> Mandatory disclosure for the hackathon. This file lives at the root of your repository. Judges cross-check it against your code and your technical video.
>
> **The deal:** disclosed shortcuts are **not** penalized — that is the entire point of this file. Hidden ones are. Undisclosed pre-built code is heavily penalized, each undisclosed mock carries a small penalty, and a faked demo is heavily penalized. Telling the truth here costs you nothing.

---

## 1. Team — who did what
Judges compare this against `git shortlog -sn`, so keep it honest.

| Member | GitHub handle | Main contributions |
|---|---|---|
| Taoufik Kallel | ASRIDK | Entire Next.js frontend: landing page, demo page, fraud/compliance/rail engine (TypeScript, client-side), stablecoin settlement UI + HKDAP ERC-20 contract, PDF receipt generation (jsPDF), Resend email receipt + lead capture |
| Felix Jahr | felixjahr | NestJS backend core: invoice extraction module, risk score service, rail decision service, invoice types, module wiring |
| Mithat Mustafov | MithatMustafov | Backend invoice analysis workflow, compliance service integration, AI audit summary (OpenRouter/Kimi K2 + Anthropic), project setup and repo init |
| Stefan Webhofer | Stefan | Risk score architecture and fraud pipeline design: 6-stage pipeline spec (invoice completeness, amount consistency, supplier identity, payment destination, fraud language, payment behavior anomaly), TypeScript type system for the fraud engine, risk level mapping (0–100 score → low/medium/high/critical), `POST /api/fraud/check` endpoint + DTOs, rail decision module stub, initial NestJS backend structure |

---

## 2. What is fully working
Features that run end-to-end on the live app, with real data and real logic. Be specific: name the feature, what input it takes, what output it produces.

- **Fraud scoring engine (frontend)** — takes an invoice object (supplier name, amount, payment destination, raw text, sender domain, flags), evaluates 8 weighted signals (urgency language, pressure language, email domain mismatch, payment destination changed, unverified wallet/account, wallet on risk list, new/unknown supplier, unusual amount), outputs a 0–100 score + low/medium/high/critical level + list of flagged signals.
- **Compliance check engine (frontend)** — runs 6 checks (Payer KYC, Supplier KYB, Sanctions screening, Jurisdiction, Goods category, Amount & policy limit) against the invoice and a hardcoded supplier registry; outputs per-check pass/fail/review status and an overall result; also derives stablecoin eligibility from the combined outcome.
- **Payment rail recommendation (frontend)** — takes the fraud result and compliance result, outputs one recommended rail (FPS, CHATS/RTGS, CIPS/RMB, SWIFT, HKD Stablecoin, or Hold/Block) with a human-readable reason and cost estimates (hardcoded fee ranges, see mocks section).
- **PDF compliance receipt generation** — client-side via jsPDF; takes the full decision object, generates a multi-section PDF with invoice details, fraud score, compliance check table, and rail decision; triggers a real browser download.
- **Receipt email delivery via Resend** — real API call to Resend; sends the PDF as an email attachment to the user-supplied address; also adds the email to a Resend Audience for marketing. Requires `RESEND_API_KEY` and `RESEND_AUDIENCE_ID` env vars; gracefully skips if not configured.
- **Live ERC-20 stablecoin settlement on Sepolia testnet** — deploys a custom HKDAP ERC-20 contract via MetaMask (or reuses a previously deployed one stored in localStorage), mints 1,000,000 HKDAP to the connected wallet, transfers the invoice amount to a recipient address, then reads live on-chain balances from Sepolia. All transactions go through real MetaMask signing and are verifiable on Sepolia Etherscan.
- **Backend: AI invoice field extraction** — NestJS endpoint accepts a base64-encoded PDF/image, calls Claude claude-sonnet-4-6 (Anthropic API) with vision, returns structured invoice JSON (invoice number, due date, supplier, payment destination, amount, currency, goods description). Requires `ANTHROPIC_API_KEY`.
- **Backend: AI goods classification** — calls Claude claude-haiku-4-5-20251001 to classify a payment purpose as `unrestricted`, `requires_review`, or `restricted`. Requires `ANTHROPIC_API_KEY`.
- **Backend: Live FX conversion** — fetches real exchange rates from `open.er-api.com` (free tier, no auth required), caches for 1 hour, uses the rate to convert non-HKD invoice amounts to HKD before fraud scoring and rail selection.
- **Backend: Sanctions name screening** — loads EU and UN consolidated sanctions XML files from disk at startup, normalises names (diacritic stripping, lowercasing), and screens supplier names against the list using fuzzy token-overlap matching. The XML files are gitignored (too large) but the parsing and matching logic is real.
- **Backend: AI audit summary** — calls OpenRouter (Kimi K2) to generate a 3–4 sentence plain-prose audit summary; falls back to a deterministic template string if `OPENROUTER_API_KEY` is absent.

---

## 3. What is mocked, stubbed, or hardcoded
Every shortcut. Examples: a login that accepts any password, a payment that always succeeds, an "AI" that is an if/else, a database that is an in-memory dictionary, fake JSON returned instead of a real API call.

**Undisclosed mocks carry a small penalty each. Anything you list here = free.**

| What is faked | Where (file:line or folder) | Why we mocked it | What the real version would do |
|---|---|---|---|
| Frontend sanctions list (2 names, 3 countries) | `frontend/lib/data/sanctions_mock.ts` | No time to wire the backend sanctions service into the frontend engine | Query a real OFAC/EU/UN sanctions API or the backend screening endpoint |
| Frontend supplier registry (3 hardcoded suppliers) | `frontend/lib/data/suppliers.ts` | No real KYB database available during hackathon | Look up verified supplier profiles from a real KYB provider or internal database |
| Frontend risky wallet list (3 obviously fake addresses) | `frontend/lib/data/risky_wallets.ts` | Illustrative only | Query a real on-chain risk/AML service (e.g. Chainalysis, TRM Labs) |
| KYC check always passes | `frontend/lib/engine/compliance.ts:32` | No identity verification infrastructure | Integrate a real KYC provider (e.g. Jumio, Onfido) |
| 4 hardcoded sample invoices for the demo | `frontend/lib/data/sample_invoices.ts` | Demo UX requires predictable showcase invoices | Accept real uploaded invoices and parse them (the backend extraction endpoint does this) |
| HKDAP stablecoin is a valueless mock ERC-20 | `frontend/contracts/HKDAP.sol`, `frontend/lib/chain/` | There is no real HKMA-regulated HKD stablecoin yet | Use a regulated HKDAP token once issued; handle real KYC/AML gates on settlement |
| Non-stablecoin payment confirmation (FPS, CHATS, CIPS, SWIFT) is UI-only | `frontend/components/widget/RailSettlement.tsx` | No banking API access to actually initiate a payment | Call a real bank/PSP API (e.g. HKMA FPS gateway, SWIFT GPI) to initiate the transfer |
| Backend rail cost estimates are hardcoded fee ranges | `backend/src/domain/rail/cost-estimator.service.ts:14–19` | No live bank fee API available | Pull actual fee schedules from each bank or rail provider's API |
| "Analyze Payment" button adds a fake 1.4 s delay before showing results | `frontend/components/widget/ReceiptCapture.tsx:25–27` | The engine runs synchronously in <1 ms; the pause is purely theatrical | Remove the artificial delay; show results immediately |

---

## 4. External APIs, services & data sources
Everything the project calls or pretends to call. Mark each as real or mocked.

| Service / API / dataset | Used for | Real call or mocked? | Auth (sandbox / test key / none) |
|---|---|---|---|
| Anthropic Claude API (claude-sonnet-4-6, claude-haiku-4-5-20251001) | Invoice field extraction from images, goods classification | Real | `ANTHROPIC_API_KEY` env var (production key) |
| OpenRouter (moonshotai/kimi-k2.6:free) | AI audit summary generation | Real (falls back to template if key absent) | `OPENROUTER_API_KEY` env var |
| open.er-api.com | Live FX rates (non-HKD invoice conversion to HKD) | Real | None (free public API) |
| Resend API | Receipt email with PDF attachment + marketing audience capture | Real | `RESEND_API_KEY` env var |
| Ethereum Sepolia testnet (via MetaMask + ethers.js) | Live ERC-20 stablecoin deploy, mint, transfer, balance read | Real (testnet, no monetary value) | MetaMask wallet (user provides test ETH for gas) |
| EU sanctions XML (European External Action Service) | Sanctions name screening in backend | Real data, loaded from local file at startup | None (public dataset) |
| UN Consolidated Sanctions List XML | Sanctions name screening in backend | Real data, loaded from local file at startup | None (public dataset) |

---

## 5. Pre-existing code
Anything written **before** kickoff that we brought into this project: prior personal projects, forked open-source code, templates, boilerplate, internal libraries.

**Undisclosed pre-built code is heavily penalized. Anything you list here = free.**

| Item | Source (URL or description) | Roughly how much | License |
|---|---|---|---|
| Next.js app scaffold | `npx create-next-app` (standard Next.js 16 boilerplate) | ~10 config/boilerplate files | MIT |
| NestJS project scaffold | `nest new` (standard NestJS CLI boilerplate) | ~8 config/boilerplate files | MIT |

All application logic — the engine, compliance checks, fraud scoring, rail recommendation, smart contract, UI components, backend services — was written during the hackathon window.

---

## 6. Known limitations & next steps
What we would build next, and the weak spots we already know about. Naming these honestly is a strength, not a flaw.

- The frontend engine and the backend engine are **two separate implementations** of similar logic that are not connected in the demo UI. The frontend runs everything client-side; the backend's richer AI-powered pipeline (real sanctions screening, live FX, Claude extraction) is only exercisable via direct API calls, not through the UI.
- **Sanctions screening in the frontend is a toy list** (2 names, 3 countries). The backend has real EU/UN XML screening, but it is not wired into the frontend widget.
- **No real payment execution** for traditional rails (FPS, CHATS, CIPS, SWIFT). Only the stablecoin path performs an actual on-chain transaction, and that uses a valueless testnet token.
- **The HKDAP contract has no access controls beyond `onlyOwner` mint**. A production stablecoin would need a regulated issuer, full ERC-20 compliance, burn/freeze mechanisms, and AML hooks.
- **No persistent state or user accounts**. Every page load starts fresh; there is no audit log, payment history, or multi-user workflow.
- **Rail cost estimates are hardcoded** — next step would be polling real bank or intermediary fee APIs to show live, accurate cost comparisons.
- **PDF extraction accuracy** depends on invoice image quality and Claude's vision output; unusual invoice layouts or scanned PDFs may produce partial or incorrect field extractions.
