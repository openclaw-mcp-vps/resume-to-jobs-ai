import { NextResponse } from "next/server";
import { upsertPurchaseRecord } from "@/lib/database";
import {
  extractPaidEmailFromStripeEvent,
  verifyStripeWebhookSignature,
} from "@/lib/lemonsqueezy";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  const valid = verifyStripeWebhookSignature(rawBody, signature, webhookSecret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const purchase = extractPaidEmailFromStripeEvent(event);
  if (purchase) {
    await upsertPurchaseRecord(purchase);
  }

  return NextResponse.json({ received: true });
}
