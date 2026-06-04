import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "BX Caller",
  description: "AI call center workspace for BixingAI",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

