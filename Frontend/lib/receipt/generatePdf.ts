import type { Decision } from "@/lib/engine/types";
import type { SettlementResult } from "@/components/widget/StablecoinSettlement";

export interface ReceiptData {
  decision: Decision;
  settlement: SettlementResult | null;
  email: string;
}

/** Build the PDF as a base64 string (browser-side, jspdf). */
export async function generateReceiptPdf(data: ReceiptData): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const { decision, settlement } = data;
  const rail = decision.rails.find((r) => r.rail === decision.recommendedRail);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  const col2 = 110;

  // --- header ---
  doc.setFillColor(21, 21, 21);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Payrouter", M, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Compliance Payment Receipt", M, 19);
  doc.text(`Generated: ${new Date().toUTCString()}`, M, 24);

  let y = 38;
  const ink = [21, 21, 21] as const;
  const muted = [107, 107, 118] as const;

  const section = (title: string) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...muted);
    doc.text(title.toUpperCase(), M, y);
    y += 1;
    doc.setDrawColor(228, 227, 234);
    doc.line(M, y, W - M, y);
    y += 5;
    doc.setTextColor(...ink);
  };

  const row = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text(label, M, y);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.text(value, col2, y);
    y += 6;
  };

  // --- invoice ---
  section("Invoice");
  row("Supplier", decision.invoice.supplierName);
  row("Country", decision.invoice.supplierCountry);
  row("Invoice #", decision.invoice.invoiceNumber);
  row("Amount", `${decision.invoice.currency} ${decision.invoice.amount.toLocaleString("en-HK")}`);
  row("Goods", decision.invoice.goods);
  row("Due date", decision.invoice.dueDate);
  y += 3;

  // --- fraud ---
  section("Fraud check");
  row("Score", `${decision.fraud.score}/100 — ${decision.fraud.level}`);
  decision.fraud.topReasons.forEach((r) => row("·", r));
  y += 3;

  // --- compliance ---
  section("Compliance");
  decision.compliance.checks.forEach((c) => row(c.label, c.status.toUpperCase()));
  y += 3;

  // --- rail ---
  section("Rail recommendation");
  row("Recommended", rail?.label ?? decision.recommendedRail);
  row("Decision", decision.action === "hold_payment" ? "HOLD — do not pay" : "APPROVED");
  row("Explanation", "");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  const lines = doc.splitTextToSize(decision.explanation, W - M - 18);
  doc.text(lines, M, y);
  y += lines.length * 5 + 4;

  // --- on-chain (only if real settlement) ---
  if (settlement?.txHash) {
    section("On-chain settlement (Sepolia)");
    row("Tx hash", settlement.txHash);
    row("Contract", settlement.contractAddress);
    row("Recipient", settlement.recipient);
    row("Etherscan", `https://sepolia.etherscan.io/tx/${settlement.txHash}`);
    y += 3;
  }

  // --- receipt id ---
  section("Receipt");
  row("Receipt ID", `PR-${decision.invoice.invoiceNumber}`);
  row("Issued to", data.email);
  row("Status", "AUDIT-READY");
  y += 6;

  // --- disclaimer ---
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...muted);
  doc.text(
    "Demo prototype. Payments are visualized/simulated and not executed, except testnet HKDAP transfers. Stablecoin is not real.",
    M,
    y,
    { maxWidth: W - M * 2 },
  );

  return doc.output("datauristring").split(",")[1];
}
