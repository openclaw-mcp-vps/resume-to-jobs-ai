import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Lock, CheckCircle2 } from "lucide-react";
import { LemonCheckoutButton } from "@/components/LemonCheckoutButton";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAccessTokenPaid } from "@/lib/database";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ accessToken?: string; paid?: string }>;
}) {
  const params = await searchParams;

  if (params.accessToken) {
    redirect(`/api/payments/activate?token=${encodeURIComponent(params.accessToken)}`);
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("rtj_access")?.value ?? "";
  const hasAccess = accessToken ? await isAccessTokenPaid(accessToken) : false;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Resume-to-Jobs AI</p>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            Back to home
          </Link>
        </div>

        {hasAccess ? (
          <div className="space-y-6">
            <Card className="border-emerald-500/25 bg-emerald-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <p className="text-sm text-emerald-100">
                  Access active. Paste your resume and generate your personalized job list.
                </p>
              </CardContent>
            </Card>
            <ResumeUpload />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  <Lock className="h-3.5 w-3.5" />
                  Tool access required
                </div>
                <CardTitle className="text-2xl">Unlock the full job search engine</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <p>
                  After checkout, your access token is activated via Lemon Squeezy webhook
                  and stored in an HttpOnly cookie on this device.
                </p>
                <ul className="space-y-2">
                  <li>- 20 ranked software job leads matched to your resume</li>
                  <li>- Salary bands attached to every lead</li>
                  <li>- Personalized pitch emails generated for all 20 jobs</li>
                </ul>
                <div className="pt-2">
                  <LemonCheckoutButton fullWidth />
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-400/30 bg-cyan-500/5">
              <CardHeader>
                <Badge variant="default" className="w-fit">
                  Pricing
                </Badge>
                <CardTitle className="text-4xl">$19</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Pay once for a focused run, or keep monthly access for ongoing searches.</p>
                <p>
                  No setup, no self-hosting, no scraping pipeline maintenance. Open the tool,
                  paste your resume, and get actionable leads in minutes.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
