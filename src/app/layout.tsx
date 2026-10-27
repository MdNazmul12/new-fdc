import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../providers";
import PwaPrompt from "../components/pwa-prompt";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FDC - Foundation Investment & Fund Management System",
  description: "Enterprise-grade financial dashboard to manage member collections, investments, interest income, double-entry accounting ledgers, and role-based permissions.",
  keywords: ["Foundation", "Investment", "Fund Management", "Accounting", "FDR", "DPS", "Ledger", "PWA"],
  authors: [{ name: "FDC Foundation" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FDC",
  },
  applicationName: "FDC",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FDC" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function purgeNetlifyBadge() {
                  try {
                    var selectors = [
                      'netlify-drawer', '#netlify-drawer', '.netlify-drawer',
                      '[data-netlify-deploy-preview-badge]', '#netlify-badge', '.netlify-badge',
                      'iframe[src*="netlify"]', '[class*="netlify"]', '[id*="netlify"]',
                      'a[href*="netlify.com"]', 'div[data-netlify]', '[data-testid="netlify-drawer"]'
                    ];
                    var elms = document.querySelectorAll(selectors.join(', '));
                    elms.forEach(function(el) {
                      try { el.remove(); } catch(e) { el.style.display = 'none'; el.style.pointerEvents = 'none'; }
                    });

                    // Search for elements containing "Powered by Netlify"
                    var elements = document.querySelectorAll('div, a, span, p, button');
                    for (var i = 0; i < elements.length; i++) {
                      var item = elements[i];
                      if (item && item.textContent && item.textContent.trim().indexOf('Powered by Netlify') !== -1) {
                        var target = item.closest('a') || item.closest('div[style*="fixed"]') || item.closest('div[style*="z-index"]') || item;
                        try { target.remove(); } catch(e) { target.style.display = 'none'; }
                      }
                    }
                  } catch (e) {}
                }
                if (typeof window !== 'undefined') {
                  purgeNetlifyBadge();
                  window.addEventListener('DOMContentLoaded', purgeNetlifyBadge);
                  window.addEventListener('load', purgeNetlifyBadge);
                  setInterval(purgeNetlifyBadge, 500);
                  if (window.MutationObserver) {
                    var obs = new MutationObserver(function() { purgeNetlifyBadge(); });
                    obs.observe(document.documentElement, { childList: true, subtree: true });
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body 
        className="min-h-screen bg-[var(--background)] text-zinc-50 font-sans selection:bg-indigo-500 selection:text-white antialiased"
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <PwaPrompt />
        </Providers>
      </body>
    </html>
  );
}
