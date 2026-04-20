import { NextResponse } from "next/server";
import { isAccessTokenPaid } from "@/lib/database";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/dashboard?paid=0", request.url));
  }

  const paid = await isAccessTokenPaid(token);

  if (!paid) {
    return NextResponse.redirect(new URL("/dashboard?paid=pending", request.url));
  }

  const response = NextResponse.redirect(new URL("/dashboard?paid=1", request.url));
  response.cookies.set("rtj_access", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 45
  });

  return response;
}
