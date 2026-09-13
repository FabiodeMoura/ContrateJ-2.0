'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const CORES: Record<string, string> = {
  'Em análise': 'bg-gray-100 text-gray-600',
  'Entrevistado': 'bg-blue-100 text-blue-700',
  'Aprovado': 'bg-green-100 text-green-700',
  'Reprovado': 'bg-red-100 text-red-700',
}

export default function SeletorStatus({
  candidatoId,
  statusAtual,
}: {
  candidatoId: string
  statusAtual: string
}) {
  const router = useRouter()
  const supabase = createClient()

  async function mudarStatus(novoStatus: string) {
    await supabase.from('candidatos').update({ status: novoStatus }).eq('id', candidatoId)
    router.refresh()
  }

  return (
    <select
      defaultValue={statusAtual}
      onChange={(e) => mudarStatus(e.target.value)}
      className={`text-xs rounded-full px-2.5 py-1 border-0 font-medium ${CORES[statusAtual] ?? ''}`}
    >
      <option value="Em análise">Em análise</option>
      <option value="Entrevistado">Entrevistado</option>
      <option value="Aprovado">Aprovado</option>
      <option value="Reprovado">Reprovado</option>
    </select>
  )
}
