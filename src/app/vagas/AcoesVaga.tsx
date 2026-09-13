'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function AcoesVaga({
  vagaId,
  token,
  funcao,
  nomeEmpresa,
}: {
  vagaId: string
  token: string
  funcao: string
  nomeEmpresa: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${baseUrl}/avaliar/${token}`

  function enviarWhatsapp() {
    const texto = `Olá! Você foi convidado a participar do processo seletivo de ${funcao} na ${nomeEmpresa}. Acesse o link para responder a avaliação: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  function copiarLink() {
    navigator.clipboard.writeText(link)
    alert('Link copiado!')
  }

  async function excluirVaga() {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return
    await supabase.from('vagas').delete().eq('id', vagaId)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 text-gray-500">
      <button onClick={enviarWhatsapp} title="Enviar pelo WhatsApp" className="hover:text-green-600">
        📱
      </button>
      <button onClick={copiarLink} title="Copiar link" className="hover:text-indigo-600">
        🔗
      </button>
      <button onClick={excluirVaga} title="Excluir vaga" className="hover:text-red-600">
        🗑️
      </button>
    </div>
  )
}
