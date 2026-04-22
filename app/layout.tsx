import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://resume-to-jobs-ai.example.com"),
  title: "Resume-to-Jobs AI | 20 Ranked Job Matches + Pitch Emails",
  description:
    "Paste your resume and get 20 ranked software engineering job matches with salary estimates and AI-generated pitch emails.",
  openGraph: {
    title: "Resume-to-Jobs AI",
    description:
      "Paste your resume and get 20 ranked software engineering jobs with salary context and personalized outreach emails.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Resume-to-Jobs AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume-to-Jobs AI",
    description:
      "Get 20 ranked job leads and personalized pitch emails from one resume paste.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${headingFont.variable} ${bodyFont.variable} bg-[#0d1117] text-[#f0f6fc] antialiased`}>
        {children}
      </body>
    </html>
  );
}
