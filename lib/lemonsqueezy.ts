import crypto from "node:crypto";

export const ACCESS_COOKIE_NAME = "r2j_access";

type AccessTokenPayload = {
  e: string;
  exp: number;
};

type StripeSignatureParts = {
  timestamp: string;
  signatures: string[];
};

function getAccessSecret() {
  return process.env.ACCESS_COOKIE_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "resume-to-jobs-dev-secret";
}

function hmacHex(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

function hmacBuffer(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest();
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function parseStripeSignature(signatureHeader: string): StripeSignatureParts | null {
  const items = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .map((part) => {
      const [key, value] = part.split("=");
      return { key, value };
    });

  const timestamp = items.find((item) => item.key === "t")?.value;
  const signatures = items.filter((item) => item.key === "v1").map((item) => item.value);

  if (!timestamp || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string, secret: string) {
  const signature = parseStripeSignature(signatureHeader);
  if (!signature) {
    return false;
  }

  const signedPayload = `${signature.timestamp}.${payload}`;
  const expected = hmacHex(signedPayload, secret);

  const isValid = signature.signatures.some((candidate) => {
    if (candidate.length !== expected.length) {
      return false;
    }
    return safeEqual(candidate, expected);
  });

  if (!isValid) {
    return false;
  }

  const timestamp = Number(signature.timestamp);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - timestamp) <= 300;
}

export function createAccessToken(email: string, ttlSeconds = 31 * 24 * 60 * 60) {
  const payload: AccessTokenPayload = {
    e: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = hmacBuffer(encodedPayload, getAccessSecret()).toString("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = hmacBuffer(encodedPayload, getAccessSecret()).toString("base64url");
  if (expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AccessTokenPayload;

    if (!payload.e || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload.e;
  } catch {
    return null;
  }
}

export function extractPaidEmailFromStripeEvent(event: unknown) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const anyEvent = event as {
    type?: string;
    data?: {
      object?: {
        customer_email?: string;
        customer_details?: {
          email?: string;
        };
        id?: string;
        customer?: string;
        created?: number;
      };
    };
  };

  const eventType = anyEvent.type ?? "";
  const dataObject = anyEvent.data?.object;

  if (!dataObject) {
    return null;
  }

  const eligible =
    eventType === "checkout.session.completed" ||
    eventType === "invoice.payment_succeeded" ||
    eventType === "checkout.session.async_payment_succeeded";

  if (!eligible) {
    return null;
  }

  const email = dataObject.customer_email ?? dataObject.customer_details?.email;
  if (!email) {
    return null;
  }

  return {
    email: email.toLowerCase(),
    sessionId: dataObject.id,
    customerId: dataObject.customer,
    purchasedAt: dataObject.created ? new Date(dataObject.created * 1000).toISOString() : new Date().toISOString(),
  };
}
