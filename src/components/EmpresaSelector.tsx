'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Filtro de empresa usado nas telas do painel.
// - Com 2 ou mais empresas: lista para escolher (e "Todas as empresas", quando permitido).
// - Com 1 empresa: só mostra o nome dela.
export default function EmpresaSelector({
  empresas,
  valorAtual,
  incluirTodas = false,
  parametro = 'empresa',
  ancora,
}: {
  empresas: { id: string; nome_fantasia: string }[]
  valorAtual: string
  incluirTodas?: boolean
  parametro?: string
  ancora?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function mudar(novoValor: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(parametro, novoValor)
    router.push(`${pathname}?${params.toString()}${ancora ? `#${ancora}` : ''}`)
  }

  if (empresas.length === 0) {
    return null
  }

  if (empresas.length === 1 && !incluirTodas) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm bg-white border rounded-lg px-3 py-2 text-gray-700">
        <span aria-hidden>🏢</span>
        {empresas[0].nome_fantasia}
      </span>
    )
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs text-gray-500 hidden sm:inline">🏢 Empresa</span>
      <select
        value={valorAtual}
        onChange={(e) => mudar(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm bg-white max-w-[16rem]"
      >
        {incluirTodas && <option value="todas">Todas as empresas</option>}
        {empresas.map((e) => (
          <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
        ))}
      </select>
    </label>
  )
}
