import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

export async function POST(req: Request) {
  let body: { email?: string; pdfBase64?: string; invoiceNumber?: string; supplier?: string; amount?: string; rail?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, pdfBase64, invoiceNumber, supplier, amount, rail } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!pdfBase64) {
    return NextResponse.json({ error: "PDF data missing" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  // 1. Send the receipt email with the PDF attached.
  if (!process.env.RESEND_API_KEY) {
    results.email = { skipped: true, reason: "RESEND_API_KEY not configured" };
  } else {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Payrouter receipt — ${supplier ?? "invoice"} · ${invoiceNumber ?? ""}`,
      html: buildHtml({ email, invoiceNumber, supplier, amount, rail }),
      attachments: [
        {
          content: Buffer.from(pdfBase64, "base64"),
          filename: `payrouter-receipt-${invoiceNumber ?? "receipt"}.pdf`,
          contentType: "application/pdf",
        },
      ],
    });
    results.email = error ? { error: error.message } : { id: data?.id };
  }

  // 2. Add to Resend Audience for marketing.
  if (!process.env.RESEND_API_KEY || !AUDIENCE_ID) {
    results.contact = { skipped: true, reason: "RESEND_AUDIENCE_ID not configured" };
  } else {
    const firstName = email.split("@")[0].split(/[._-]/)[0] ?? "";
    const { data, error } = await resend.contacts.create({
      audienceId: AUDIENCE_ID,
      email,
      firstName,
      unsubscribed: false,
    });
    // Ignore duplicate-contact errors (contact already exists = fine for us).
    results.contact = error && !error.message?.toLowerCase().includes("exists")
      ? { error: error.message }
      : { id: (data as { id?: string } | null)?.id ?? "captured" };
  }

  return NextResponse.json({ ok: true, results });
}

function buildHtml(p: {
  email?: string;
  invoiceNumber?: string;
  supplier?: string;
  amount?: string;
  rail?: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#efeef3;margin:0;padding:32px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(80,70,120,0.15)">
    <div style="background:#151515;padding:28px 32px">
      <div style="font-size:20px;font-weight:700;color:#fff">Payrouter</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px">Compliance Payment Receipt</div>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#151515;font-size:15px">
        Your compliance receipt is attached as a PDF.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${tr("Supplier", p.supplier)}
        ${tr("Amount", p.amount)}
        ${tr("Invoice", p.invoiceNumber)}
        ${tr("Rail", p.rail)}
      </table>
      <div style="margin-top:24px;padding:14px;background:#efeef3;border-radius:12px;font-size:12px;color:#6b6b76">
        Demo prototype. Payments are visualized/simulated. Stablecoin settlement is testnet-only with no real value.
      </div>
    </div>
  </div>
</body></html>`;
}

function tr(label: string, value?: string) {
  if (!value) return "";
  return `<tr>
    <td style="padding:6px 0;color:#6b6b76;width:120px">${label}</td>
    <td style="padding:6px 0;font-weight:600;color:#151515">${value}</td>
  </tr>`;
}
