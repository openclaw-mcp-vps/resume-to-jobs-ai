import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono"
});

const siteName = "Resume-to-Jobs AI";
const siteDescription =
  "Paste your resume and get 20 ranked software engineering jobs with salary estimates and personalized pitch emails.";

export const metadata: Metadata = {
  metadataBase: new URL("https://resume-to-jobs-ai.com"),
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  openGraph: {
    title: siteName,
    description: siteDescription,
    type: "website",
    url: "https://resume-to-jobs-ai.com",
    siteName
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription
  },
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
