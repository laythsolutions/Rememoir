import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PinGate } from "@/components/PinLock";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8a6228" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1a15" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: {
    default: "Rememoir",
    template: "%s | Rememoir",
  },
  description: "My memories, my thoughts, my reflections, Me.",
  applicationName: "Rememoir",
  keywords: ["journal", "diary", "mood", "reflection", "self-hosted", "private"],
  authors: [{ name: "Rememoir" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rememoir",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    title: "Rememoir",
    description: "My memories, my thoughts, my reflections, Me.",
    siteName: "Rememoir",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-TileColor" content="#8a6028" />
        {/* Inline script prevents flash of wrong theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('rememoir_theme');if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();` }} />
      </head>
      <body className={`${inter.variable} ${lora.variable} font-[family-name:var(--font-inter)] antialiased min-h-screen bg-background text-foreground pt-[env(safe-area-inset-top)] pb-[calc(4rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-background focus:border focus:border-border focus:shadow-lg focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <PinGate>
          <div id="main-content">
            {children}
          </div>
          <BottomNav />
        </PinGate>
      </body>
    </html>
  );
}
