import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ErrorNest — AI-Powered Error Monitoring & Debugging",
    template: "%s | ErrorNest",
  },
  description:
    "ErrorNest captures, groups, and explains application exceptions in real time with context-aware AI. Compress detection and comprehension time in minutes.",
  keywords: [
    "error monitoring",
    "error tracking",
    "debugging",
    "AI diagnostics",
    "exception tracking",
    "stack trace",
    "crash reporting",
    "application monitoring",
    "Sentry alternative",
  ],
  authors: [{ name: "ErrorNest Team" }],
  creator: "ErrorNest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    title: "ErrorNest — AI-Powered Error Monitoring & Debugging",
    description:
      "Capture, group, and explain application exceptions in real time with context-aware AI.",
    siteName: "ErrorNest",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ErrorNest — AI-Powered Error Monitoring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ErrorNest — AI-Powered Error Monitoring & Debugging",
    description:
      "Capture, group, and explain application exceptions in real time with context-aware AI.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ErrorNest",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description:
      "AI-powered error monitoring platform that captures, groups, and explains application exceptions in real time.",
    url: APP_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
