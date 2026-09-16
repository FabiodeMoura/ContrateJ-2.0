'use client'

import { useState } from 'react'

// Troque pelo link de checkout real do produto "link avulso" no Hotmart
const LINK_HOTMART_AVULSO = 'https://pay.hotmart.com/SEU-PRODUTO-AVULSO'

export default function ComprarLinksExtrasButton() {
  const [quantidade, setQuantidade] = useState(5)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center border rounded-lg overflow-hidden">
        <button
          onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          className="px-3 py-2 text-sm hover:bg-gray-50"
        >
          −
        </button>
        <span className="px-4 text-sm font-medium">{quantidade} links</span>
        <button
          onClick={() => setQuantidade((q) => q + 1)}
          className="px-3 py-2 text-sm hover:bg-gray-50"
        >
          +
        </button>
      </div>
      <p className="text-sm text-gray-500">= R$ {(quantidade * 2).toFixed(2).replace('.', ',')}</p>
      <a
        href={LINK_HOTMART_AVULSO}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg text-center"
      >
        Comprar no Hotmart
      </a>
    </div>
  )
}
