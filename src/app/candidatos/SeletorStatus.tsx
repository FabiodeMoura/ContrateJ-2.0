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
  recomendacao,
}: {
  candidatoId: string
  statusAtual: string
  recomendacao?: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  async function mudarStatus(novoStatus: string) {
    await supabase.from('candidatos').update({ status: novoStatus }).eq('id', candidatoId)

    if (novoStatus === 'Aprovado') {
      const { data: jaExiste } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('candidato_id', candidatoId)
        .maybeSingle()

      if (!jaExiste) {
        const { data: candidato } = await supabase
          .from('candidatos')
          .select('nome_completo, email, whatsapp, vagas ( funcao, empresa_id )')
          .eq('id', candidatoId)
          .single()

        const vaga = candidato ? (Array.isArray(candidato.vagas) ? candidato.vagas[0] : candidato.vagas) : null

        if (candidato && vaga) {
          await supabase.from('colaboradores').insert({
            empresa_id: (vaga as any).empresa_id,
            candidato_id: candidatoId,
            nome_completo: candidato.nome_completo,
            email: candidato.email,
            whatsapp: candidato.whatsapp,
            funcao: (vaga as any).funcao,
            status: 'Ativo',
          })
        }
      }
    }

    router.refresh()
  }

  const mostrarAtalho = statusAtual === 'Em análise' && recomendacao === 'Recomendado'

  return (
    <div className="flex flex-col gap-1.5 items-start">
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

      {mostrarAtalho && (
        <button
          onClick={() => mudarStatus('Entrevistado')}
          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition"
        >
          Seguir para entrevista →
        </button>
      )}
    </div>
  )
}
