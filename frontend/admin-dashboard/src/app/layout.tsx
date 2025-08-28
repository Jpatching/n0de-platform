import type { Metadata } from "next";
import { Inter, Audiowide } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const audiowide = Audiowide({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-audiowide',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "PV3 Admin Dashboard - Mission Control",
  description: "Advanced admin dashboard for PV3 Web3 gaming platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${audiowide.variable} font-satoshi antialiased bg-bg-main text-text-primary`}>
        {children}
      </body>
    </html>
  );
}
