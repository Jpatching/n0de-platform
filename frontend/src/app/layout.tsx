import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Toaster from '@/components/Toaster';
import ClientLayout from './ClientLayout';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "N0DE - Enterprise Solana RPC Infrastructure",
  description: "High-performance Solana RPC nodes with Yellowstone gRPC. Save 70% on costs while getting 10x better performance. Purpose-built for DeFi, trading, and enterprise applications.",
  keywords: ["Solana", "RPC", "Yellowstone", "gRPC", "DeFi", "Trading", "Enterprise", "API", "Blockchain"],
  authors: [{ name: "N0DE" }],
  creator: "N0DE",
  publisher: "N0DE",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://n0de.pro'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#00ff87' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://n0de.pro',
    siteName: 'N0DE',
    title: 'N0DE - Enterprise Solana RPC Infrastructure',
    description: 'High-performance Solana RPC nodes with Yellowstone gRPC. Save 70% on costs while getting 10x better performance.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'N0DE - Enterprise Solana RPC Infrastructure',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@N0DE_rpc',
    creator: '@N0DE_rpc',
    title: 'N0DE - Enterprise Solana RPC Infrastructure',
    description: 'High-performance Solana RPC nodes with Yellowstone gRPC. Save 70% on costs while getting 10x better performance.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased bg-bg-main text-text-primary font-inter`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
        <Toaster />
        {process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DISABLE_ANALYTICS && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
