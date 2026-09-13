import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ContrateJá — Talentos que fazem a diferença no seu negócio',
  description: 'Avaliação comportamental para contratação em restaurantes, bares, lanchonetes, padarias, sacolões e pizzarias.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
