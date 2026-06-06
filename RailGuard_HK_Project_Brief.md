# RailGuard HK — AI Invoice-to-Payment Decision Layer for Hong Kong SMEs

## 1. Executive Summary

**RailGuard HK** is an AI-powered decision layer for Hong Kong SMEs that turns an uploaded supplier invoice into a safe, compliant, and payment-ready decision.

Instead of asking SMEs to manually decide whether to pay through **FPS, CHATS/RTGS, CIPS/RMB rails, SWIFT, or a newly regulated HKD stablecoin rail**, RailGuard analyzes the invoice, checks fraud and compliance risks, recommends the best payment route, and produces a clear payment summary before money moves.

### One-line pitch

> **RailGuard HK is Google Maps for SME payments: upload an invoice, and we choose the safest, fastest, most compliant payment route before money moves.**

### Core idea

```text
Upload invoice
→ Extract invoice details
→ Run fraud checks
→ Run compliance checks
→ Recommend payment rail
→ User confirms
→ Visual payment completion
→ Compliance receipt generated
```

### Final product positioning

RailGuard HK is **not** just an invoice scanner and **not** just a stablecoin demo.

It is the **decision layer before payment execution**:

> Should this invoice be paid?  
> If yes, which rail should be used?  
> If no, why should the payment be held, reviewed, or blocked?

---

## 2. Why This Idea Fits the Hackathon

The fintech judge emphasized:

- Helping communities
- Clear pain point
- Compliance
- Fast, efficient, and safe payment journeys
- Hong Kong applicability

RailGuard HK directly answers all of these.

| Judge criterion | How RailGuard HK answers it |
|---|---|
| Community impact | Helps Hong Kong SMEs avoid invoice fraud and payment mistakes |
| Pain point | SMEs face confusing rails, manual checks, invoice fraud, and compliance burden |
| Compliance | Runs sanctions, KYC, jurisdiction, amount-limit, and audit checks before payment |
| Fast and efficient | Recommends the best rail based on invoice context |
| Safe payment journey | Payment is only initiated after fraud and compliance checks |
| Hong Kong relevance | Uses FPS, CHATS/RTGS, CIPS/RMB, SWIFT, and HKD stablecoin rails |
| Wow effect | Upload invoice → risk dashboard → rail decision → visual payment completion |

---

## 3. Problem

Hong Kong SMEs often receive supplier invoices from local, Mainland Chinese, and international counterparties. Before paying, they must answer several questions manually:

1. Is this invoice real?
2. Is the supplier legitimate?
3. Did the bank account or wallet change?
4. Is this payment compliant?
5. Is this payment urgent or suspicious?
6. Which rail should we use?
7. Should we use FPS, CHATS/RTGS, CIPS, SWIFT, or stablecoin?
8. What audit trail do we need?

Today, these decisions are fragmented across accounting systems, bank portals, payment providers, compliance tools, and manual human judgment.

RailGuard HK unifies the decision into one clear flow.

---

## 4. Market Gap

There are already products that solve parts of this problem:

- Accounts payable automation tools can process invoices.
- Banks and payment hubs can execute payments.
- Fraud tools can screen transactions.
- Compliance systems can check sanctions and AML risks.
- Cross-border payment platforms can move money internationally.

But there is still a gap for a simple SME-facing product that does this:

```text
Invoice upload
→ AI extraction
→ Fraud and compliance check
→ Payment rail recommendation
→ Payment-ready summary
```

The differentiated gap is:

> **Invoice-first payment rail intelligence for Hong Kong SMEs.**

Existing tools often help with execution. RailGuard HK focuses on the **decision before execution**.

---

## 5. Hong Kong Context

RailGuard HK is specifically designed for Hong Kong’s financial infrastructure.

### FPS

Hong Kong’s Faster Payment System operates on a 24/7 basis and supports payments in HKD and RMB. It is suitable for fast local payments and certain retail or SME payment use cases.

Source: HKMA Faster Payment System page:  
<https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/financial-market-infrastructure/faster-payment-system-fps/>

### CHATS / RTGS

Hong Kong has real-time gross settlement systems for large-value and interbank payments, including HKD, USD, EUR, and RMB RTGS systems.

Source: HKMA Payment Systems page:  
<https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/financial-market-infrastructure/payment-systems/>

### CIPS

CIPS is a wholesale payment system authorized by the People’s Bank of China, specializing in RMB cross-border payment clearing and settlement.

Source: CIPS official introduction:  
<https://www.cips.com.cn/en/about_us/about_cips/introduction/index.html>

### Stablecoins in Hong Kong

Hong Kong’s stablecoin issuer regulatory regime came into effect on **1 August 2025**. The issuance of fiat-referenced stablecoins in Hong Kong is now a regulated activity requiring a licence from the HKMA.

Source: HKMA Regulatory Regime for Stablecoin Issuers:  
<https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/stablecoin-issuers/>

This makes the stablecoin angle timely and Hong Kong-specific, but RailGuard HK does not claim to issue a stablecoin. In the hackathon, stablecoin execution should be described as a **visual or testnet simulation** of how regulated HKD stablecoin rails could fit into an SME payment workflow.

---

## 6. Product Concept

### Product name

**RailGuard HK**

### Tagline options

1. **Google Maps for SME payments.**
2. **The decision layer before money moves.**
3. **Upload an invoice. Get the safest payment route.**
4. **Fast payments are powerful. Safe payment decisions are essential.**
5. **RailGuard decides whether, how, and through which rail an invoice should be paid.**

### Product mission

> To help Hong Kong SMEs pay invoices faster and safer by automatically checking fraud, compliance, and rail suitability before money moves.

---

## 7. Target User

### Primary user

Hong Kong SMEs that regularly pay:

- Local suppliers
- Mainland Chinese suppliers
- European or international suppliers
- Cross-border service providers
- Logistics partners
- Import/export counterparties

### Example persona

**HarbourTech Components Ltd.**  
A Hong Kong electronics importer that buys components from Mainland China and Europe. The company has limited finance staff and wants faster payments, but it worries about invoice fraud, compliance mistakes, and confusing rail choices.

### User pain points

- “I do not know if this invoice is real.”
- “The supplier says their bank details changed — is that safe?”
- “Should I use FPS, SWIFT, RMB rails, or stablecoin?”
- “How do I prove compliance if something goes wrong?”
- “I want fast payments, but I do not want to send money to a scammer.”

---

## 8. Core User Flow

### Step 1: Upload invoice

User uploads an invoice PDF, image, or text file.

For the hackathon MVP, this can be implemented as:

- Real file upload with PDF/text parsing, or
- A sample invoice selector, or
- A text area where the invoice content is pasted.

### Step 2: AI extracts payment details

RailGuard extracts:

- Supplier name
- Supplier country
- Invoice number
- Amount
- Currency
- Goods or service description
- Due date
- Payment destination
- Bank account, FPS ID, IBAN, wallet address, or other payment details
- Urgency language
- Changed payment details

Example output:

```json
{
  "supplier_name": "Berlin Components GmbH",
  "supplier_country": "Germany",
  "invoice_number": "INV-2026-4472",
  "amount": 42000,
  "currency": "HKD",
  "goods": "Microcontroller components",
  "due_date": "2026-06-10",
  "payment_destination": "0xSAFE...",
  "urgency_detected": false,
  "payment_details_changed": false
}
```

### Step 3: Fraud check

RailGuard checks for invoice fraud patterns.

### Step 4: Compliance check

RailGuard checks whether the payment is allowed and whether it requires review.

### Step 5: Rail recommendation

RailGuard compares available rails:

- FPS
- CHATS / RTGS
- CIPS / RMB rail
- SWIFT
- HKD stablecoin
- Hold / manual review / block

### Step 6: Decision summary

User sees a clear summary:

1. Extracted invoice details
2. Fraud risk result
3. Compliance result
4. Rail recommendation
5. Explanation
6. Confirm or hold action

### Step 7: Visual payment completion

For the hackathon demo, payment execution is visualized rather than technically integrated.

Example:

```text
Confirm payment
→ Processing via recommended rail
→ Payment initiated
→ Receipt generated
```

For the stablecoin rail, the demo may show a simulated transaction hash:

```text
HKD stablecoin settlement simulated
Transaction reference: 0xA92...F31
```

### Step 8: Compliance receipt

RailGuard generates an audit-ready receipt.

---

## 9. Fraud Checking Pipeline

The invoice should go through a structured pre-settlement safety pipeline.

### 9.1 Invoice completeness check

Checks:

- Invoice number exists
- Supplier name exists
- Amount exists
- Currency exists
- Payment details exist
- Due date exists
- Goods or service description exists

Example result:

```json
{
  "invoice_completeness": "passed",
  "missing_fields": []
}
```

### 9.2 Amount consistency check

Checks:

- Does total amount match line items?
- Does currency match invoice context?
- Is the amount unusually high for this supplier or SME?

Example red flag:

```text
Invoice total is HKD 420,000, but previous invoices to this supplier were around HKD 40,000.
```

### 9.3 Supplier identity check

Checks:

- Is the supplier known?
- Is this a new supplier?
- Does the supplier name match the expected company?
- Does the email domain match the supplier?
- Does the country match the supplier profile?

Example red flag:

```text
Supplier name: Berlin Components GmbH
Sender domain: berlin-component-payments.com
Expected domain: berlin-components.com
```

### 9.4 Payment destination check

Checks:

- Has this bank account or wallet been used before?
- Did the payment destination change?
- Is the wallet or account on a risk list?
- Does the account holder or wallet belong to the supplier?
- Is the destination format valid?

Example red flag:

```text
Payment wallet changed from previous invoice and is not verified.
```

### 9.5 Fraud language check

Detect suspicious invoice or message language:

- “Urgent”
- “Pay today”
- “Our account changed”
- “Use this new wallet”
- “Do not call”
- “Confidential”
- “Shipment will be cancelled”
- “CEO approved”
- “Avoid delay”

Example result:

```json
{
  "urgency_detected": true,
  "changed_payment_details_detected": true,
  "pressure_language_detected": true,
  "fraud_pattern": "possible_invoice_redirection_fraud"
}
```

### 9.6 Payment behavior anomaly check

Checks:

- Is the payment amount unusual?
- Is this a new country for the SME?
- Is this a new supplier?
- Is this a new payment rail?
- Is this the first stablecoin payment?
- Is the payment being attempted too quickly after invoice upload?

Example result:

```json
{
  "amount_percentile_for_sme": 98,
  "new_supplier": true,
  "new_payment_rail": true,
  "payment_attempted_too_quickly": true
}
```

### 9.7 Final fraud score

Example low-risk result:

```json
{
  "fraud_risk_score": 7,
  "risk_level": "low",
  "top_reasons": [
    "Supplier is verified",
    "Payment details are unchanged",
    "No urgency language detected",
    "Amount is within historical range"
  ]
}
```

Example high-risk result:

```json
{
  "fraud_risk_score": 91,
  "risk_level": "critical",
  "top_reasons": [
    "Payment wallet changed from previous invoice",
    "Urgency language detected",
    "Supplier email domain mismatch",
    "New beneficiary for a large payment"
  ],
  "recommended_action": "hold_payment"
}
```

---

## 10. Compliance Checking Pipeline

For the hackathon, these checks can be mocked with sample data, but the UI should make them look enterprise-grade and auditable.

### 10.1 Payer KYC check

Checks whether the SME is verified.

Example:

```text
✓ Payer KYC verified
```

### 10.2 Supplier KYC / KYB check

Checks whether the supplier company is verified.

Example:

```text
✓ Supplier business profile verified
```

### 10.3 Sanctions screening

Checks whether the supplier, beneficiary, wallet, bank account, or jurisdiction appears on a sanctions or risk list.

For MVP, use a mock sanctions list.

Example:

```text
✓ Sanctions screening passed
```

Or:

```text
✕ Sanctions screening failed
Action: Block payment
```

### 10.4 Jurisdiction risk check

Checks whether the supplier country is allowed under the SME’s payment policy.

Example:

```text
✓ Jurisdiction allowed
```

### 10.5 Goods category check

Checks whether the invoice includes restricted or sensitive goods.

Examples of sensitive categories:

- Dual-use electronics
- Defense-related goods
- Restricted chemicals
- High-risk technology exports

Example:

```text
⚠ Goods category requires enhanced review
```

### 10.6 Amount and policy limit check

Checks whether the amount is within policy.

Example:

```text
✓ Amount below stablecoin settlement limit
```

Or:

```text
⚠ Amount exceeds SME stablecoin policy limit
Recommended rail: CHATS/RTGS or SWIFT with approval
```

### 10.7 Stablecoin eligibility check

Stablecoin should only be recommended if:

1. Supplier accepts stablecoin
2. Supplier has verified wallet
3. Invoice is low risk
4. Jurisdiction is allowed
5. Goods are not restricted
6. Amount is within policy limit
7. Compliance checks pass
8. Stablecoin rail is actually useful for this payment

Example:

```json
{
  "stablecoin_eligible": true,
  "reason": "Verified supplier wallet, low fraud risk, and HKD-denominated invoice"
}
```

Or:

```json
{
  "stablecoin_eligible": false,
  "reason": "Supplier has no verified stablecoin wallet"
}
```

---

## 11. Payment Rails and Decision Logic

RailGuard should not always recommend stablecoin. The product becomes more credible when it recommends the right rail depending on the invoice.

### 11.1 FPS

Use when:

- Supplier is local Hong Kong recipient
- Payment is in HKD or RMB
- Amount is small or medium
- Recipient is verified
- Fast local settlement is useful

Example recommendation:

```text
Recommended rail: FPS
Reason: Local HKD supplier, small amount, verified recipient, instant settlement available.
```

### 11.2 CHATS / RTGS

Use when:

- Payment is domestic or supported by Hong Kong RTGS systems
- Amount is large
- Payment requires finality
- Bank-level settlement is preferred

Example:

```text
Recommended rail: CHATS/RTGS
Reason: Large-value HKD payment requiring real-time final settlement.
```

### 11.3 CIPS / RMB rail

Use when:

- Supplier is in Mainland China
- Payment currency is RMB
- Corporate RMB settlement is needed
- Compliance checks pass

Example:

```text
Recommended rail: CIPS/RMB rail via bank
Reason: Mainland supplier, RMB invoice, cross-border RMB settlement required.
```

### 11.4 SWIFT

Use when:

- Supplier is international
- Supplier does not accept stablecoin
- Payment currency is not suitable for FPS/CIPS
- Traditional bank transfer is required
- Compliance passes but stablecoin is unavailable

Example:

```text
Recommended rail: SWIFT
Reason: International supplier has no verified stablecoin wallet; traditional bank transfer is the safest available option.
```

### 11.5 HKD stablecoin

Use when:

- Supplier is cross-border
- Supplier accepts stablecoin
- Supplier wallet is verified
- Invoice is low risk
- Jurisdiction is allowed
- Amount is within policy
- Fast settlement is valuable

Example:

```text
Recommended rail: HKD Stablecoin
Reason: Verified supplier wallet, low fraud risk, HKD-denominated invoice, and fast settlement needed.
```

### 11.6 Hold / review / block

Use when:

- Fraud risk is high
- Wallet or bank account changed unexpectedly
- Urgency language detected
- Supplier identity mismatch
- Sanctions or compliance check fails
- Goods are restricted
- Amount is unusual and requires approval

Example:

```text
Decision: Hold payment
Reason: Payment details changed, urgency language detected, and beneficiary is unverified.
```

---

## 12. Decision Outcomes After Invoice Upload

The invoice upload should return one of five outcomes.

| Outcome | Meaning | User action |
|---|---|---|
| Use FPS | Local HK/RMB payment, low risk | Confirm FPS payment visually |
| Use CHATS/RTGS | Large-value or urgent domestic settlement | Confirm bank settlement visually |
| Use CIPS/RMB | Mainland RMB supplier payment | Confirm RMB rail payment visually |
| Use SWIFT | International supplier, stablecoin unavailable | Generate bank transfer package |
| Use HKD stablecoin | Verified wallet and low-risk cross-border invoice | Simulate stablecoin settlement |
| Hold / Review / Block | Fraud or compliance risk | Do not pay; show reasons and next steps |

---

## 13. Example Demo Invoices

Use 3 demo invoices in the hackathon.

### 13.1 Fraudulent invoice

Invoice text:

```text
Berlin Components GmbH
Amount: HKD 42,000

URGENT: Our payment wallet has changed.
Please send today to avoid shipment cancellation.
Do not use the previous payment details.
New wallet: 0xFAKE...
```

RailGuard output:

```text
Decision: Hold payment
Fraud risk: 91/100 — Critical
Stablecoin eligible: No
SWIFT eligible: No until review
Reason: Possible invoice redirection fraud
```

Top reasons:

- Payment wallet changed
- Urgency language detected
- Supplier payment destination unverified
- Large payment to new beneficiary

Suggested next steps:

- Call supplier using previously known contact
- Request written confirmation from known email domain
- Require manager approval

### 13.2 Local Hong Kong supplier

Invoice:

```text
Kowloon Office Supplies Ltd.
Amount: HKD 8,500
Payment method: FPS ID office@kowloon-supplies.hk
```

RailGuard output:

```text
Decision: Use FPS
Fraud risk: 5/100 — Low
Reason: Local Hong Kong supplier, small HKD payment, verified recipient
```

### 13.3 Clean international supplier with stablecoin option

Invoice:

```text
Berlin Components GmbH
Amount: HKD 42,000
Goods: Microcontroller components
Payment wallet: 0xSAFE...
Payment terms: Net 30
```

RailGuard output:

```text
Decision: Use HKD Stablecoin
Fraud risk: 7/100 — Low
Compliance: Passed
Reason: Verified supplier wallet, low risk, HKD-denominated invoice, fast settlement useful
```

Visual payment:

```text
Confirm payment
→ Processing via HKD Stablecoin rail
→ Settlement simulated
→ Transaction reference: 0xA92...F31
→ Compliance receipt generated
```

### 13.4 Mainland RMB supplier

Invoice:

```text
Shenzhen Precision Manufacturing Co.
Amount: RMB 200,000
Goods: Electronic components
Bank: Mainland RMB account
```

RailGuard output:

```text
Decision: Use CIPS/RMB rail via bank
Reason: Mainland supplier, RMB invoice, cross-border RMB settlement
```

---

## 14. Summary Screen Design

After invoice upload, show one clear summary screen.

### Section 1: Extracted invoice details

```text
Supplier: Berlin Components GmbH
Country: Germany
Amount: HKD 42,000
Invoice ID: INV-2026-4472
Goods: Microcontroller components
Payment destination: 0xSAFE...
Due date: 2026-06-10
```

### Section 2: Fraud check

```text
Fraud Risk: 7/100 — Low

✓ Supplier name matches known profile
✓ Payment details unchanged
✓ No urgency or pressure language detected
✓ Amount within expected range
✓ Beneficiary verified
```

Or for fraud:

```text
Fraud Risk: 91/100 — Critical

✕ Wallet changed from previous invoice
✕ Urgency language detected
✕ Supplier email domain mismatch
✕ New beneficiary for large payment

Recommendation: Hold payment
```

### Section 3: Compliance check

```text
Compliance: Passed

✓ Payer KYC verified
✓ Supplier KYB verified
✓ Sanctions screening passed
✓ Jurisdiction allowed
✓ Goods category allowed
✓ Amount within policy limit
```

### Section 4: Rail recommendation

Show all rail cards:

| Rail | Status | Reason |
|---|---|---|
| FPS | Not suitable | Supplier is cross-border |
| CHATS/RTGS | Not suitable | Not a domestic high-value settlement |
| CIPS/RMB | Not suitable | Supplier is not Mainland RMB recipient |
| SWIFT | Available | Traditional cross-border fallback |
| HKD Stablecoin | Recommended | Verified wallet, low risk, fastest settlement |

### Section 5: User action

```text
Recommended action: Confirm HKD stablecoin payment
Button: Confirm payment
```

For high risk:

```text
Recommended action: Hold payment
Button: Create review case
```

---

## 15. Risk Scoring Model for MVP

Use a simple rule-based scoring engine with AI explanations.

### Example scoring rules

```javascript
let risk = 0;

if (newSupplier) risk += 15;
if (amountUnusual) risk += 15;
if (paymentDestinationChanged) risk += 30;
if (walletOrAccountNotVerified) risk += 25;
if (urgencyDetected) risk += 20;
if (pressureLanguageDetected) risk += 15;
if (emailDomainMismatch) risk += 25;
if (walletOnRiskList) risk += 40;
if (sanctionsHit) risk = 100;

risk = Math.min(risk, 100);
```

### Risk level mapping

| Score | Level | Action |
|---:|---|---|
| 0–30 | Low | Approve and recommend rail |
| 31–60 | Medium | Warn or require confirmation |
| 61–85 | High | Require manual verification |
| 86–100 | Critical | Hold or block payment |

---

## 16. Rail Recommendation Logic for MVP

Use simple deterministic logic.

```javascript
function recommendRail(invoice, fraudScore, compliance, supplier) {
  if (fraudScore >= 86 || compliance.sanctionsHit) {
    return "HOLD_OR_BLOCK";
  }

  if (invoice.country === "Hong Kong" && invoice.amount < 100000 && invoice.currency === "HKD") {
    return "FPS";
  }

  if (invoice.country === "Hong Kong" && invoice.amount >= 100000) {
    return "CHATS_RTGS";
  }

  if (invoice.country === "Mainland China" && invoice.currency === "RMB") {
    return "CIPS_RMB";
  }

  if (
    supplier.verifiedStablecoinWallet &&
    invoice.currency === "HKD" &&
    fraudScore <= 30 &&
    compliance.passed &&
    invoice.amount <= supplier.stablecoinLimit
  ) {
    return "HKD_STABLECOIN";
  }

  return "SWIFT";
}
```

This is enough for a convincing hackathon prototype.

---

## 17. Technical Architecture

### Frontend

Recommended stack:

- Next.js / React
- Tailwind CSS
- shadcn/ui
- Framer Motion for animations

Main screens:

1. Landing / dashboard
2. Invoice upload or sample selector
3. Analysis loading screen
4. Invoice extraction result
5. Fraud and compliance dashboard
6. Rail recommendation screen
7. Confirm payment visual screen
8. Compliance receipt screen

### Backend

Recommended stack:

- FastAPI or Node.js / Express
- Rule-based risk engine
- Mock supplier database
- Mock sanctions database
- Mock payment rail config
- Optional LLM for extraction and explanation

Endpoints:

```text
POST /api/invoice/parse
POST /api/fraud/check
POST /api/compliance/check
POST /api/rail/recommend
POST /api/payment/visual-confirm
POST /api/receipt/generate
```

### Data stores

For hackathon, simple JSON files are enough:

- `suppliers.json`
- `risky_wallets.json`
- `sanctions_mock.json`
- `rail_rules.json`
- `sample_invoices.json`

### AI layer

Use AI for:

- Extracting invoice fields
- Detecting suspicious language
- Explaining the decision in plain English
- Generating the compliance receipt summary

Do not rely on AI alone for scoring. Use deterministic rules so the demo is predictable.

---

## 18. MVP Scope for 24 Hours

### Must build

- Invoice upload or sample invoice selector
- Invoice field extraction
- Fraud score
- Compliance checklist
- Rail recommendation cards
- Visual payment confirmation
- Receipt generation
- Three sample invoices

### Nice to have

- PDF parsing
- OCR
- Animated risk meter
- Simulated transaction hash
- Downloadable receipt
- Stablecoin testnet transfer if time allows

### Skip

- Real payment integration
- Real FPS / CHATS / CIPS / SWIFT integration
- Real sanctions API
- Real bank API
- Real regulated stablecoin issuance
- Full blockchain implementation unless already comfortable

---

## 19. Payment Execution in the Demo

The payment execution should be visual only unless there is enough time to add a testnet stablecoin transfer.

### Honest demo wording

> “In this hackathon demo, payment execution is visualized. Our implemented core is the invoice intelligence, fraud/compliance scoring, and rail decision engine.”

### Stablecoin wording

> “We simulate a future regulated HKD stablecoin rail. We are not issuing a real stablecoin.”

This avoids overclaiming and keeps the idea credible.

---

## 20. Business Model

### Potential customers

- Hong Kong SMEs
- Banks serving SMEs
- Payment service providers
- SME accounting platforms
- B2B payment platforms
- Trade finance platforms

### B2B SaaS model

Offer RailGuard as:

1. A standalone SME dashboard
2. An API for banks and PSPs
3. A plugin for accounting / AP systems

### Pricing ideas

- Monthly SME subscription
- Per-invoice analysis fee
- Per-payment decision fee
- Enterprise API pricing for banks / PSPs

### Stronger long-term positioning

> RailGuard becomes the decision engine that sits between invoices and payment rails.

---

## 21. Competitive Differentiation

### Not just invoice automation

Invoice automation helps process invoices. RailGuard decides how and whether to pay them.

### Not just fraud detection

Fraud detection flags risk. RailGuard also recommends the best payment rail.

### Not just payment orchestration

Payment orchestration routes transactions. RailGuard starts from the invoice and includes fraud, compliance, and rail suitability.

### Not just stablecoin

Stablecoin is one rail among many. RailGuard recommends stablecoin only when it is safe, compliant, and useful.

---

## 22. Demo Video Structure

You need:

- 2-minute pitch
- 2-minute technical video
- 2-minute idea / business video

### 22.1 Two-minute pitch structure

**0:00–0:20 — Problem**

Hong Kong SMEs receive invoices from local, Mainland, and international suppliers. Before paying, they must manually check fraud, compliance, and which rail to use.

**0:20–0:40 — Solution**

RailGuard HK lets SMEs upload an invoice and instantly gets a fraud score, compliance result, and rail recommendation.

**0:40–1:20 — Demo**

Show:

1. Fraud invoice → hold payment
2. Clean local invoice → FPS
3. Clean international invoice → HKD stablecoin visual settlement

**1:20–1:45 — Why now / Hong Kong relevance**

Hong Kong has FPS, CHATS/RTGS, RMB rails, SWIFT connectivity, and now a regulated stablecoin regime. SMEs need a decision layer across all these rails.

**1:45–2:00 — Closing**

RailGuard is Google Maps for SME payments: it chooses the safest route before money moves.

### 22.2 Two-minute technical video structure

Show architecture:

```text
Invoice upload
→ AI parser
→ Fraud engine
→ Compliance engine
→ Rail recommendation engine
→ Visual payment confirmation
→ Receipt generator
```

Show sample JSON input/output, risk rules, and rail decision logic.

### 22.3 Two-minute business / idea video structure

Explain:

- SME pain point
- Why Hong Kong is the right market
- Why multiple rails create decision complexity
- Why stablecoin is timely but not always appropriate
- Potential B2B SaaS/API business model

---

## 23. Suggested UI Copy

### Landing page

```text
RailGuard HK
AI payment decision layer for Hong Kong SMEs

Upload an invoice. Detect fraud. Check compliance. Choose the safest rail.
```

### Upload screen

```text
Upload supplier invoice
RailGuard will extract payment details, check risk, and recommend the best payment rail.
```

### Loading state

```text
Extracting invoice details...
Checking supplier identity...
Scanning for fraud patterns...
Running compliance checks...
Comparing payment rails...
```

### Low-risk result

```text
Payment approved
Fraud risk: Low
Compliance: Passed
Recommended rail: HKD Stablecoin
```

### High-risk result

```text
Payment held
Fraud risk: Critical
Reason: Possible invoice redirection fraud
Recommended action: Verify supplier before payment
```

### Receipt

```text
Payment decision receipt generated
This receipt records the invoice, risk checks, compliance status, recommended rail, and user confirmation.
```

---

## 24. Example API Output

```json
{
  "invoice": {
    "supplier": "Berlin Components GmbH",
    "country": "Germany",
    "amount": 42000,
    "currency": "HKD",
    "invoice_id": "INV-2026-4472",
    "goods": "Microcontroller components",
    "payment_destination": "0xSAFE..."
  },
  "fraud_check": {
    "score": 7,
    "level": "low",
    "signals": [
      "Supplier verified",
      "Payment destination verified",
      "No urgency language detected",
      "Amount within expected range"
    ]
  },
  "compliance_check": {
    "status": "passed",
    "checks": {
      "payer_kyc": "passed",
      "supplier_kyb": "passed",
      "sanctions": "passed",
      "jurisdiction": "allowed",
      "goods_category": "allowed",
      "amount_limit": "passed"
    }
  },
  "rail_recommendation": {
    "recommended_rail": "HKD_STABLECOIN",
    "reason": "Verified supplier wallet, low fraud risk, HKD-denominated invoice, and fast settlement needed",
    "alternatives": [
      {
        "rail": "SWIFT",
        "status": "available",
        "reason": "Traditional fallback"
      },
      {
        "rail": "FPS",
        "status": "not_suitable",
        "reason": "Supplier is cross-border"
      }
    ]
  },
  "decision": {
    "action": "confirm_payment",
    "payment_execution": "visualized_in_demo",
    "receipt_required": true
  }
}
```

---

## 25. Final Pitch Script

> Hong Kong SMEs do not just need faster payments — they need safer payment decisions.  
>  
> Today, when an SME receives an invoice, they must manually check if the invoice is real, whether the beneficiary is safe, whether compliance is passed, and which rail to use: FPS, CHATS, CIPS, SWIFT, or now stablecoin.  
>  
> RailGuard HK is the AI decision layer before money moves. The SME uploads an invoice, and RailGuard extracts the details, checks fraud and compliance risks, recommends the safest rail, and generates an audit-ready payment summary.  
>  
> If the invoice is local and low-risk, we recommend FPS. If it is a large domestic payment, CHATS/RTGS. If it is RMB to Mainland China, CIPS/RMB rail. If stablecoin is safe and verified, we recommend HKD stablecoin. If the invoice is suspicious, we hold the payment.  
>  
> RailGuard is Google Maps for SME payments: we choose the safest route before money moves.

---

## 26. Final Verdict

RailGuard HK is a strong hackathon idea because it is:

- Focused enough to build in 24 hours
- Broad enough to feel valuable
- Hong Kong-specific
- Compliance-oriented
- Stablecoin-timely without being crypto-only
- Easy to demo visually
- Strongly aligned with safe, fast, efficient payment journeys

### Final build target

```text
Invoice upload
→ Fraud/compliance analysis
→ Rail decision summary
→ User confirmation
→ Visual payment completion
→ Receipt
```

### Final tagline

> **RailGuard HK: The decision layer before SME payments.**

