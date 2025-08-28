import type { Metadata } from 'next'
import { Inter, Audiowide } from 'next/font/google'
import './globals.css'
import { SolanaProvider } from '@/components/SolanaProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import Footer from '@/components/Footer'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const audiowide = Audiowide({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-audiowide',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PV3.FUN - 1v1 Gaming on Solana',
  description: 'Non-custodial 1v1 gaming platform with revolutionary anti-cheat technology',
  manifest: '/manifest.json',
}

function ServiceWorkerRegistration() {
  if (typeof window !== 'undefined') {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('🚀 Service Worker registered - games will load instantly!');
            
            setInterval(() => {
              registration.update();
            }, 30000);
          })
          .catch((error) => {
            console.log('Service Worker registration failed:', error);
          });
      });
    }
  }
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Satoshi:wght@300;400;500;600;700;800;900&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={`${inter.variable} ${audiowide.variable} font-inter antialiased`}>
          <AuthProvider>
            <SolanaProvider>
              {children}
            <Footer />
            </SolanaProvider>
          </AuthProvider>
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
