'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function GerarLinkEntrevista({
  candidatoId,
  nomeCandidato,
  linkExistente,
}: {
  candidatoId: string
  nomeCandidato: string
  linkExistente: string | null
}) {
  const [link, setLink] = useState(
    linkExistente?.includes('meet.jit.si')
      ? linkExistente.replace('meet.jit.si', 'meet.ffmuc.net')
      : linkExistente
  )
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function gerarLink() {
    setCarregando(true)

    // meet.jit.si passou a exigir login para criar salas — usamos um servidor
    // Jitsi público alternativo (mesma ferramenta, sem necessidade de conta)
    const sala = `ContrateJa-${candidatoId.replace(/-/g, '').slice(0, 12)}`
    const novoLink = `https://meet.ffmuc.net/${sala}`

    const { error } = await supabase
      .from('candidatos')
      .update({ link_entrevista: novoLink })
      .eq('id', candidatoId)

    setCarregando(false)

    if (!error) {
      setLink(novoLink)
      router.refresh()
    }
  }

  function copiar() {
    if (!link) return
    const texto = `Olá, ${nomeCandidato}! Sua entrevista será por vídeo. Acesse no horário combinado: ${link}`
    navigator.clipboard.writeText(texto)
    alert('Mensagem copiada!')
  }

  function enviarWhatsapp() {
    if (!link) return
    const texto = `Olá, ${nomeCandidato}! Sua entrevista será por vídeo. Acesse no horário combinado: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (!link) {
    return (
      <button
        onClick={gerarLink}
        disabled={carregando}
        className="text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-full px-2.5 py-1 hover:bg-indigo-100 disabled:opacity-60"
      >
        {carregando ? 'Gerando...' : '🎥 Gerar link'}
      </button>
    )
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => window.open(link!, '_blank')}
        className="text-xs font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-full px-2.5 py-1 hover:bg-indigo-100"
      >
        🎥 Entrar
      </button>
      <button
        onClick={enviarWhatsapp}
        className="text-xs font-medium text-green-700 border border-green-200 bg-green-50 rounded-full px-2.5 py-1 hover:bg-green-100"
      >
        📱 Enviar
      </button>
      <button
        onClick={copiar}
        className="text-xs font-medium text-gray-600 border rounded-full px-2.5 py-1 hover:bg-gray-50"
      >
        🔗
      </button>
    </div>
  )
}
