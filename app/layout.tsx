import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI FP&A Variance Analyzer",
  description:
    "Deterministic FP&A variance analysis with reconciled evidence, structured AI interpretation, and business guardrails."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
