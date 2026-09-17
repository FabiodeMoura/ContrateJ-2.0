import './globals.css'
import type { Metadata, Viewport } from 'next'
import RegistrarServiceWorker from '@/components/RegistrarServiceWorker'
import SincronizarFila from '@/components/SincronizarFila'
import ProvisionarConta from '@/components/ProvisionarConta'

export const metadata: Metadata = {
  title: 'ContrateJá — Talentos que fazem a diferença no seu negócio',
  description: 'Avaliação comportamental para contratação em restaurantes, bares, lanchonetes, padarias, sacolões e pizzarias.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ContrateJá',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegistrarServiceWorker />
        <SincronizarFila />
        <ProvisionarConta />
      </body>
    </html>
  )
}
