"use client";

import { useState } from "react";
import { Clipboard, ClipboardCheck } from "lucide-react";
import type { PitchEmailDraft } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PitchEmailProps = {
  pitch: PitchEmailDraft;
  company: string;
  title: string;
};

export function PitchEmail({ pitch, company, title }: PitchEmailProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`Subject: ${pitch.subject}\n\n${pitch.body}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Card className="border-[#2d3642] bg-[#0d1117]/90">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-[#f0f6fc]">Pitch for {company}</CardTitle>
            <CardDescription className="mt-1">{title}</CardDescription>
          </div>
          <Button type="button" variant="secondary" className="h-9 px-3" onClick={handleCopy}>
            {copied ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#8b949e]">Subject</p>
          <p className="mt-1 text-sm font-medium text-[#f0f6fc]">{pitch.subject}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#8b949e]">Body</p>
          <pre className="mt-1 whitespace-pre-wrap rounded-md border border-[#30363d] bg-[#0b1017] p-3 text-sm leading-6 text-[#c9d1d9]">
            {pitch.body}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
