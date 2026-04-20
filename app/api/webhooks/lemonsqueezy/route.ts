import { NextResponse } from "next/server";
import { saveAccessToken } from "@/lib/database";
import {
  extractAccessToken,
  parseLemonWebhookPayload,
  verifyLemonWebhookSignature
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

const PAID_EVENTS = new Set([
  "order_created",
  "subscription_created",
  "subscription_payment_success",
  "subscription_resumed"
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  const isValid = verifyLemonWebhookSignature({
    body: rawBody,
    signature,
    secret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = parseLemonWebhookPayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "unknown";
  const accessToken = extractAccessToken(payload);

  if (accessToken) {
    const email = payload.data?.attributes?.user_email ?? "customer@lemonsqueezy";
    const orderId = payload.data?.id ?? `unknown-${Date.now()}`;

    await saveAccessToken({
      token: accessToken,
      email,
      orderId,
      status: PAID_EVENTS.has(eventName) ? "paid" : "pending"
    });
  }

  return NextResponse.json({
    received: true,
    event: eventName
  });
}
