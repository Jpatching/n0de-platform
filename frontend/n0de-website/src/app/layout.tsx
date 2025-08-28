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
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: 'swap',
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
  metadataBase: new URL('https://N0DE.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://N0DE.app',
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
