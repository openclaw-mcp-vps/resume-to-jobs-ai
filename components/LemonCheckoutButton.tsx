"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

function createToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `rtj_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function LemonCheckoutButton({
  email,
  fullWidth = false
}: {
  email?: string;
  fullWidth?: boolean;
}) {
  const [accessToken, setAccessToken] = useState("");
  const [origin, setOrigin] = useState("");

  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  useEffect(() => {
    const existing = localStorage.getItem("rtj_access_token");
    const token = existing || createToken();
    localStorage.setItem("rtj_access_token", token);
    setAccessToken(token);
    setOrigin(window.location.origin);
  }, []);

  const checkoutUrl = useMemo(() => {
    if (!productId || !accessToken || !origin) {
      return "";
    }

    const url = new URL(`https://checkout.lemonsqueezy.com/buy/${productId}`);
    url.searchParams.set("embed", "1");
    url.searchParams.set("media", "0");
    url.searchParams.set("checkout[custom][access_token]", accessToken);
    url.searchParams.set(
      "checkout[success_url]",
      `${origin}/dashboard?accessToken=${accessToken}`
    );
    if (email) {
      url.searchParams.set("checkout[email]", email);
    }
    return url.toString();
  }, [productId, accessToken, origin, email]);

  if (!productId) {
    return (
      <Button
        type="button"
        disabled
        variant="secondary"
        className={fullWidth ? "w-full" : ""}
      >
        Configure Lemon Squeezy product ID
      </Button>
    );
  }

  return (
    <>
      <Script src="https://assets.lemonsqueezy.com/lemon.js" strategy="lazyOnload" />
      <a
        href={checkoutUrl || "#"}
        className={cn(
          "lemonsqueezy-button",
          buttonVariants({ size: "lg" }),
          fullWidth ? "w-full" : ""
        )}
      >
        Unlock Resume-to-Jobs AI
      </a>
    </>
  );
}
