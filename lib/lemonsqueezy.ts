import crypto from "node:crypto";

const LEMON_CHECKOUT_BASE = "https://checkout.lemonsqueezy.com/buy";

export function buildLemonCheckoutUrl(input: {
  productId: string;
  accessToken: string;
  successUrl: string;
  email?: string;
}): string {
  const { productId, accessToken, successUrl, email } = input;
  const url = new URL(`${LEMON_CHECKOUT_BASE}/${productId}`);

  url.searchParams.set("embed", "1");
  url.searchParams.set("media", "0");
  url.searchParams.set("checkout[custom][access_token]", accessToken);
  url.searchParams.set("checkout[success_url]", successUrl);
  if (email) {
    url.searchParams.set("checkout[email]", email);
  }

  return url.toString();
}

export function verifyLemonWebhookSignature(input: {
  body: string;
  signature: string | null;
  secret: string | undefined;
}): boolean {
  const { body, signature, secret } = input;
  if (!signature || !secret) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

export type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      access_token?: string;
      [key: string]: unknown;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      user_email?: string;
      custom_data?: {
        access_token?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  };
};

export function parseLemonWebhookPayload(raw: string): LemonWebhookPayload | null {
  try {
    return JSON.parse(raw) as LemonWebhookPayload;
  } catch {
    return null;
  }
}

export function extractAccessToken(payload: LemonWebhookPayload): string | null {
  return (
    payload.meta?.custom_data?.access_token ??
    payload.data?.attributes?.custom_data?.access_token ??
    null
  );
}
