'use client'

import { useState } from 'react'

// Baixa a planilha-modelo gerada no servidor (logo do ContrateJá, colunas com largura certa,
// listas de Empresa e Função para escolher e aba "Como preencher").
export default function BaixarModeloButton() {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function baixar() {
    setBaixando(true)
    setErro(null)
    try {
      const resposta = await fetch('/api/colaboradores/modelo', { cache: 'no-store' })
      if (!resposta.ok) throw new Error(String(resposta.status))
      const arquivo = await resposta.blob()
      const url = URL.createObjectURL(arquivo)
      const link = document.createElement('a')
      link.href = url
      link.download = 'contrateja-modelo-colaboradores.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setErro('Não foi possível baixar o modelo. Atualize a página e tente de novo.')
    }
    setBaixando(false)
  }

  return (
    <div className="w-full md:w-auto">
      <button
        onClick={baixar}
        disabled={baixando}
        className="border bg-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full md:w-auto disabled:opacity-60"
      >
        {baixando ? 'Gerando modelo...' : '⬇️ Baixar modelo'}
      </button>
      {erro && <p className="mt-1 text-xs text-red-600 max-w-xs">{erro}</p>}
    </div>
  )
}
