'use client'

import { useEffect } from 'react'

export default function RegistrarServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Se falhar, o app segue funcionando normalmente (só sem o modo offline)
      })
    }
  }, [])

  return null
}
