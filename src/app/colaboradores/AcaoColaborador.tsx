'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function AcaoColaborador({
  id,
  status,
}: {
  id: string
  status: string
}) {
  const router = useRouter()
  const supabase = createClient()

  async function alternarStatus() {
    const novoStatus = status === 'Ativo' ? 'Desligado' : 'Ativo'
    const confirmacao = novoStatus === 'Desligado'
      ? confirm('Confirma o desligamento desse colaborador? Isso conta no turnover.')
      : true
    if (!confirmacao) return

    await supabase
      .from('colaboradores')
      .update({
        status: novoStatus,
        desligado_em: novoStatus === 'Desligado' ? new Date().toISOString() : null,
      })
      .eq('id', id)

    router.refresh()
  }

  return (
    <button
      onClick={alternarStatus}
      className={`text-xs font-medium rounded-full px-2.5 py-1 ${
        status === 'Ativo' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
      }`}
    >
      {status === 'Ativo' ? 'Desligar' : 'Reativar'}
    </button>
  )
}
