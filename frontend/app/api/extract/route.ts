import { NextResponse } from "next/server";
import type { Currency, Invoice } from "@/lib/engine/types";

export const runtime = "nodejs";

/** Best-effort local extraction so "paste your own" works without any API key. */
function heuristicExtract(text: string): Invoice | null {
  const trimmed = text.trim();
  if (trimmed.length < 5) return null;

  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const amountMatch = trimmed.match(/(HKD|RMB|USD|EUR)\s*([\d,]+(?:\.\d+)?)/i);
  const currency = (amountMatch?.[1]?.toUpperCase() ?? "HKD") as Currency;
  const amount = amountMatch ? Number(amountMatch[2].replace(/,/g, "")) : 0;

  const walletMatch = trimmed.match(/0x[a-zA-Z0-9.]+/);
  const fpsMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  const destination = walletMatch?.[0] ?? fpsMatch?.[0] ?? "unknown-destination";

  const domainMatch = trimmed.match(/@([\w.-]+\.\w+)/);

  // Supplier name: first non-empty line that isn't an obvious field line.
  const supplierName =
    lines.find((l) => !/amount|payment|wallet|invoice|urgent|terms/i.test(l)) ??
    lines[0] ??
    "Unknown Supplier";

  const country = /hong kong|\.hk|fps/i.test(trimmed)
    ? "Hong Kong"
    : /shenzhen|mainland|rmb|china/i.test(trimmed)
      ? "Mainland China"
      : "Unknown";

  return {
    id: `pasted-${Date.now()}`,
    supplierName,
    supplierCountry: country,
    invoiceNumber: trimmed.match(/INV[-\s]?[\w-]+/i)?.[0] ?? "PASTED-0001",
    amount,
    currency,
    goods: "Goods / services (pasted)",
    dueDate: new Date().toISOString().slice(0, 10),
    paymentDestination: destination,
    senderDomain: domainMatch?.[1],
    rawText: trimmed,
    paymentDetailsChanged: /changed|new wallet|new account/i.test(trimmed.toLowerCase()),
    acceptsStablecoin: !!walletMatch,
  };
}

export async function POST(req: Request) {
  let body: { text?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ message: "Paste some invoice text first." }, { status: 400 });
  }

  // Optional LLM extraction when a provider key is configured.
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const invoice = await llmExtract(text, anthropicKey);
      if (invoice) return NextResponse.json({ invoice, source: "llm" });
    } catch {
      // fall through to heuristic
    }
  }

  const invoice = heuristicExtract(text);
  if (!invoice) {
    return NextResponse.json({
      message: "Couldn’t read that invoice. Try one of the sample invoices.",
    });
  }
  return NextResponse.json({ invoice, source: "heuristic" });
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start, end + 1);
}

/** Extraction-only LLM call (the engine still makes every scoring/routing decision). */
async function llmExtract(text: string, apiKey: string): Promise<Invoice | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Extract invoice fields as strict JSON with keys: supplierName, supplierCountry, invoiceNumber, amount (number), currency (HKD|RMB|USD|EUR), goods, dueDate (YYYY-MM-DD), paymentDestination, senderDomain, paymentDetailsChanged (boolean), acceptsStablecoin (boolean). Only output JSON.\n\nInvoice:\n${text}`,
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const raw = data?.content?.[0]?.text ?? "";
  const json = extractJsonObject(raw);
  if (!json) return null;
  const parsed = JSON.parse(json);
  return {
    id: `llm-${Date.now()}`,
    rawText: text,
    ...parsed,
  } as Invoice;
}
