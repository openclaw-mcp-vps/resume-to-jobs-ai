import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { hasActivePurchase } from "@/lib/database";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/lemonsqueezy";

export async function getAuthorizedEmailFromToken(token?: string) {
  if (!token) {
    return null;
  }

  const email = verifyAccessToken(token);
  if (!email) {
    return null;
  }

  const active = await hasActivePurchase(email);
  if (!active) {
    return null;
  }

  return email;
}

export async function getAuthorizedEmailFromRequest(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  return getAuthorizedEmailFromToken(token);
}

export async function hasAuthorizedPageAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const email = await getAuthorizedEmailFromToken(token);
  return Boolean(email);
}
