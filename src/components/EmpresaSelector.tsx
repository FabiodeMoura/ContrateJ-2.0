'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

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

  if (empresas.length <= 1 && !incluirTodas) {
    return null
  }

  return (
    <select
      value={valorAtual}
      onChange={(e) => mudar(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm bg-white"
    >
      {incluirTodas && <option value="todas">Todas as empresas</option>}
      {empresas.map((e) => (
        <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
      ))}
    </select>
  )
}
