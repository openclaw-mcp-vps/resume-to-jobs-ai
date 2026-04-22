import { NextResponse } from "next/server";
import { z } from "zod";
import { hasActivePurchase } from "@/lib/database";
import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/lemonsqueezy";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const email = payload.email.trim().toLowerCase();

    const active = await hasActivePurchase(email);
    if (!active) {
      return NextResponse.json(
        {
          error:
            "No active purchase found for this email yet. If you just paid, wait 15-30 seconds for webhook sync and try again.",
        },
        { status: 403 },
      );
    }

    const token = createAccessToken(email);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: token,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 31 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
