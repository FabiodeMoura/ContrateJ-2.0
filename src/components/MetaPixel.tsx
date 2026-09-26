'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { META_PIXEL_ID, PAGINAS_COM_PIXEL, rastrear } from '@/lib/metaPixel'

// Carrega o Pixel da Meta só nas páginas públicas e conta uma visita (PageView) a cada troca de página.
export default function MetaPixel() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || !PAGINAS_COM_PIXEL.includes(pathname)) return
    const w = window as any
    if (!w.fbq) {
      const n: any = function (...args: unknown[]) {
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args)
      }
      w.fbq = n
      if (!w._fbq) w._fbq = n
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []
      const s = document.createElement('script')
      s.async = true
      s.src = 'https://connect.facebook.net/en_US/fbevents.js'
      document.head.appendChild(s)
      w.fbq('init', META_PIXEL_ID)
    }
    rastrear('PageView')
    if (pathname === '/') rastrear('ViewContent', { content_name: 'Página de vendas' })
  }, [pathname])

  return null
}
