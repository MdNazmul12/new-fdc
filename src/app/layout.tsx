import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FDC - Foundation Investment & Fund Management System",
  description: "Enterprise-grade financial dashboard to manage member collections, investments, interest income, double-entry accounting ledgers, and role-based permissions.",
  keywords: ["Foundation", "Investment", "Fund Management", "Accounting", "FDR", "DPS", "Ledger"],
  authors: [{ name: "FDC Foundation" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500 selection:text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
