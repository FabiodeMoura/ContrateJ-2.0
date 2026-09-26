// Pixel da Meta (conjunto de dados "ContrateJá Site").
// Só roda nas páginas públicas (vendas, login, obrigado, termos e privacidade),
// nunca nas telas do sistema nem nas páginas do candidato.
export const META_PIXEL_ID = '1641688520917865'

export const PAGINAS_COM_PIXEL = ['/', '/login', '/obrigado', '/privacidade', '/termos']

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function rastrear(evento: string, dados?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return
  if (dados) window.fbq('track', evento, dados)
  else window.fbq('track', evento)
}
