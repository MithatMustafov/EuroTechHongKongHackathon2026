import type { Decision } from "@/lib/engine/types";

type RGB = [number, number, number];

const C = {
  ink:    [20,  20,  30]  as RGB,
  muted:  [120, 120, 140] as RGB,
  white:  [255, 255, 255] as RGB,
  ok:     [22,  163, 74]  as RGB,
  danger: [220, 38,  38]  as RGB,
  warn:   [217, 119, 6]   as RGB,
  brand:  [99,  102, 241] as RGB,
  line:   [229, 231, 235] as RGB,
  bg:     [248, 249, 251] as RGB,
  dark:   [16,  16,  28]  as RGB,
};

function statusColor(s: string): RGB {
  if (s === "passed") return C.ok;
  if (s === "failed") return C.danger;
  return C.warn;
}
function statusLabel(s: string) {
  if (s === "passed") return "PASSED";
  if (s === "failed") return "FAILED";
  return "REVIEW";
}
function railStatusColor(s: string): RGB {
  if (s === "recommended") return C.brand;
  if (s === "not_suitable") return [180, 180, 195] as RGB;
  return C.ok;
}
function fmtHkd(n: number) {
  return n === 0 ? "Free" : `HK$${n.toLocaleString()}`;
}
function trunc(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export async function downloadDecisionReport(decision: Decision): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const ML = 14;
  const MR = 14;
  const CW = PW - ML - MR; // 182 mm
  const now = new Date();
  const inv = decision.invoice;

  let y = 0;
  let pageNum = 1;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const tc = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const fc = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const dc = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  function sectionTitle(title: string) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    tc(C.muted);
    doc.text(title, ML, y);
    y += 3.5;
    dc(C.line);
    doc.line(ML, y, PW - MR, y);
    y += 4.5;
  }

  function addPage() {
    doc.addPage();
    pageNum++;
    // Slim header on continuation pages
    fc(C.dark);
    doc.rect(0, 0, PW, 7, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    tc(C.white);
    doc.text("Payrouter Decision Report", ML, 5);
    doc.setTextColor(160, 160, 180);
    doc.text(`Inv: ${inv.invoiceNumber}   |   Page ${pageNum}`, PW - MR, 5, { align: "right" });
    y = 14;
  }

  function guard(needed = 18) {
    if (y + needed > PH - 20) addPage();
  }

  // ── MAIN HEADER ──────────────────────────────────────────────────────────────

  fc(C.dark);
  doc.rect(0, 0, PW, 25, "F");

  // Brand accent bar
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 3, 25, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  tc(C.white);
  doc.text("Payrouter", ML, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(170, 175, 210);
  doc.text("Decision & Compliance Report", ML, 19);

  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  doc.setFontSize(7);
  doc.setTextColor(190, 190, 215);
  doc.text(`Generated ${dateStr} at ${timeStr}`, PW - MR, 10, { align: "right" });
  doc.text(`Invoice ${inv.invoiceNumber}`, PW - MR, 16, { align: "right" });
  doc.text(`Report ID: PR-${inv.invoiceNumber}`, PW - MR, 22, { align: "right" });

  y = 32;

  // ── INVOICE SUMMARY ───────────────────────────────────────────────────────────

  sectionTitle("INVOICE SUMMARY");

  const fields: [string, string][] = [
    ["Supplier",   inv.supplierName],
    ["Country",    inv.supplierCountry],
    ["Amount",     `${inv.currency} ${inv.amount.toLocaleString()}`],
    ["Invoice #",  inv.invoiceNumber],
    ...(inv.goods    ? [["Goods",    inv.goods]    as [string, string]] : []),
    ...(inv.dueDate  ? [["Due date", inv.dueDate]  as [string, string]] : []),
  ];

  const colW = CW / 3;
  let maxRow = 0;
  fields.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = ML + col * colW;
    const fy  = y + row * 10;
    maxRow = Math.max(maxRow, row);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    tc(C.muted);
    doc.text(label, x, fy);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    tc(C.ink);
    doc.text(trunc(value, 28), x, fy + 4.5);
  });
  y += (maxRow + 1) * 10 + 3;

  // ── DECISION BANNER ───────────────────────────────────────────────────────────

  const held       = decision.action === "hold_payment";
  const bannerFill = held ? C.danger : ([34, 160, 80] as RGB);
  fc(bannerFill);
  doc.roundedRect(ML, y, CW, 14, 2.5, 2.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  tc(C.white);
  doc.text(`${held ? "✗" : "✓"}  PAYMENT ${held ? "HELD" : "APPROVED"}`, ML + 6, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  if (held) {
    doc.text("Compliance review required before release", ML + 6, y + 11);
  } else {
    const rl = decision.rails.find((r) => r.rail === decision.recommendedRail)?.label ?? "";
    doc.text(`Recommended rail: ${rl}`, ML + 6, y + 11);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(held ? 255 : 210, held ? 230 : 255, held ? 230 : 210);
  doc.text(`Fraud: ${decision.fraud.score}/100 · ${decision.fraud.level.toUpperCase()}`, PW - MR - 4, y + 6, { align: "right" });
  doc.text(`Compliance: ${decision.compliance.status.toUpperCase()}`, PW - MR - 4, y + 11, { align: "right" });

  y += 19;

  // ── COMPLIANCE CHECKS ─────────────────────────────────────────────────────────

  sectionTitle("COMPLIANCE CHECKS");

  // Column header
  fc(C.bg);
  doc.rect(ML, y, CW, 5.5, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  tc(C.muted);
  doc.text("CHECK", ML + 2, y + 3.8);
  doc.text("STATUS", ML + 84 + 11, y + 3.8, { align: "center" });
  doc.text("DETAIL", ML + 112, y + 3.8);
  y += 5.5;

  decision.compliance.checks.forEach((check, i) => {
    guard(14);
    const rowH = 7;

    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 255);
      doc.rect(ML, y, CW, rowH, "F");
    }

    // Label
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    tc(C.ink);
    doc.text(trunc(check.label, 40), ML + 2, y + 4.5);

    // Status badge
    const sc = statusColor(check.status);
    fc(sc);
    doc.roundedRect(ML + 83, y + 1.5, 24, 4, 1, 1, "F");
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    tc(C.white);
    doc.text(statusLabel(check.status), ML + 95, y + 4.5, { align: "center" });

    // Detail
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    tc(C.muted);
    doc.text(trunc(check.detail ?? "", 54), ML + 112, y + 4.5);

    dc(C.line);
    doc.line(ML, y + rowH, PW - MR, y + rowH);
    y += rowH;

    // Sanctions hit detail
    const hitScreens = check.meta?.screens?.filter((s) => s.hits > 0) ?? [];
    hitScreens.forEach((s) => {
      guard(8);
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(200, 50, 50);
      const names = s.matches?.slice(0, 5).join("  ·  ") ?? "";
      doc.text(`   ↳ ${s.entity}: ${trunc(names, 100)}`, ML + 2, y + 3.5);
      y += 5.5;
    });
  });

  y += 5;

  // ── FRAUD ANALYSIS ─────────────────────────────────────────────────────────────

  guard(32);
  sectionTitle("FRAUD ANALYSIS");

  const fraudLevel = decision.fraud.level;
  const fraudColor: RGB =
    fraudLevel === "low" ? C.ok : fraudLevel === "medium" ? C.warn : C.danger;

  // Score + level badge
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  tc(fraudColor);
  doc.text(`${decision.fraud.score}`, ML, y + 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(C.muted);
  doc.text("/ 100", ML + 13, y + 7);

  fc(fraudColor);
  doc.roundedRect(ML + 28, y + 1, 20, 5.5, 1.5, 1.5, "F");
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  tc(C.white);
  doc.text(fraudLevel.toUpperCase(), ML + 38, y + 5, { align: "center" });

  // Score bar
  const barX = ML + 54;
  const barW = 82;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(barX, y + 2, barW, 4, 1.5, 1.5, "F");
  fc(fraudColor);
  const fill = Math.max((decision.fraud.score / 100) * barW, 2);
  doc.roundedRect(barX, y + 2, fill, 4, 1.5, 1.5, "F");

  y += 11;

  // Signals
  if (decision.fraud.topReasons.length > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    tc(C.ink);
    doc.text("Key signals:", ML, y);
    y += 4.5;
    decision.fraud.topReasons.slice(0, 5).forEach((r) => {
      guard(6);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      tc(C.muted);
      doc.text(`·  ${r}`, ML + 3, y);
      y += 4.5;
    });
  } else {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    tc(C.ok);
    doc.text("·  No significant fraud signals detected", ML + 3, y);
    y += 4.5;
  }

  y += 6;

  // ── RAIL COMPARISON ───────────────────────────────────────────────────────────

  guard(42);
  sectionTitle("RAIL COMPARISON");

  fc(C.bg);
  doc.rect(ML, y, CW, 5.5, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  tc(C.muted);
  doc.text("RAIL",       ML + 2,   y + 3.8);
  doc.text("STATUS",     ML + 38,  y + 3.8);
  doc.text("EST. COST",  ML + 76,  y + 3.8);
  doc.text("SETTLEMENT", ML + 110, y + 3.8);
  doc.text("NOTE",       ML + 146, y + 3.8);
  y += 5.5;

  const sortedRails = decision.rails
    .filter((r) => r.rail !== "HOLD_OR_BLOCK")
    .sort((a, b) => {
      const rank = (s: string) => s === "recommended" ? 0 : s === "available" ? 1 : 2;
      return rank(a.status) - rank(b.status);
    });

  sortedRails.forEach((r, i) => {
    guard(10);
    const rowH = 8;

    if (r.status === "recommended") {
      doc.setFillColor(238, 240, 255);
    } else if (i % 2 === 0) {
      doc.setFillColor(252, 252, 255);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(ML, y, CW, rowH, "F");

    // Rail name
    doc.setFontSize(8);
    doc.setFont("helvetica", r.status === "recommended" ? "bold" : "normal");
    tc(r.status === "not_suitable" ? C.muted : C.ink);
    doc.text(r.label, ML + 2, y + 5);

    // Badge
    const rc = railStatusColor(r.status);
    fc(rc);
    const bTxt = r.status === "recommended" ? "RECOMMENDED" : r.status === "available" ? "AVAILABLE" : "N/A";
    const bW   = Math.max(bTxt.length * 1.35 + 3, 14);
    doc.roundedRect(ML + 36, y + 2, bW, 4, 1, 1, "F");
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    tc(C.white);
    doc.text(bTxt, ML + 36 + bW / 2, y + 5, { align: "center" });

    // Cost
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    tc(r.status === "not_suitable" ? C.muted : C.ink);
    if (r.cost) {
      const costStr =
        r.cost.totalMin === r.cost.totalMax
          ? fmtHkd(r.cost.totalMin)
          : `${fmtHkd(r.cost.totalMin)}–${fmtHkd(r.cost.totalMax)}`;
      doc.text(costStr, ML + 76, y + 5);
    } else {
      doc.text("—", ML + 76, y + 5);
    }

    // Settlement
    doc.text(r.cost?.settlementTime ?? "—", ML + 110, y + 5);

    // Note
    doc.setFontSize(6.5);
    tc(C.muted);
    doc.text(trunc(r.reason ?? "", 26), ML + 146, y + 5);

    dc(C.line);
    doc.line(ML, y + rowH, PW - MR, y + rowH);
    y += rowH;
  });

  // ── FOOTER ────────────────────────────────────────────────────────────────────

  // Place footer on EVERY page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fY = PH - 14;
    dc(C.line);
    doc.line(ML, fY, PW - MR, fY);
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    tc(C.muted);
    doc.text(
      "RailGuard is a decision support tool. This report does not constitute a payment instruction or legal compliance certification.",
      ML, fY + 4,
    );
    doc.text(
      `© ${now.getFullYear()} Payrouter · Report PR-${inv.invoiceNumber} · ${dateStr}`,
      PW - MR, fY + 4, { align: "right" },
    );
    doc.text(`Page ${p} of ${totalPages}`, PW / 2, fY + 9, { align: "center" });
  }

  doc.save(`payrouter-${inv.invoiceNumber}-${now.toISOString().slice(0, 10)}.pdf`);
}
