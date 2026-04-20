"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PitchEmailModel } from "@/lib/types";

export function PitchEmail({
  pitch,
  company,
  title
}: {
  pitch: PitchEmailModel;
  company: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`${pitch.subject}\n\n${pitch.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{company}</CardTitle>
          <p className="mt-1 text-sm text-slate-400">{title}</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-semibold text-cyan-200">Subject: {pitch.subject}</p>
        <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
          {pitch.body}
        </pre>
      </CardContent>
    </Card>
  );
}
