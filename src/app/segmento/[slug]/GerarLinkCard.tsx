'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function GerarLinkCard({
  perfilId,
  funcao,
  icone,
  empresaId,
  nomeEmpresa,
}: {
  perfilId: string
  funcao: string
  icone: string
  empresaId: string
  nomeEmpresa: string
}) {
  const [carregando, setCarregando] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const supabase = createClient()

  async function gerarLink() {
    if (!empresaId) return
    setCarregando(true)
    setErro(null)

    const { data, error } = await supabase
      .from('vagas')
      .insert({ empresa_id: empresaId, perfil_disc_id: perfilId, funcao })
      .select('token_link')
      .single()

    setCarregando(false)

    if (error || !data) {
      setErro('Não foi possível gerar o link. Tente novamente.')
      return
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    setLink(`${baseUrl}/avaliar/${data.token_link}`)
  }

  function mensagemPadrao() {
    return `Olá! Você foi convidado a participar do processo seletivo de ${funcao} na ${nomeEmpresa}. Acesse o link para responder a avaliação: ${link}`
  }

  function copiarLink() {
    if (!link) return
    navigator.clipboard.writeText(mensagemPadrao())
    alert('Mensagem copiada!')
  }

  function enviarWhatsapp() {
    if (!link) return
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagemPadrao())}`, '_blank')
  }

  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-lg shrink-0">
          {icone}
        </div>
        <div>
          <p className="font-medium text-sm">{funcao}</p>
          <p className="text-xs text-gray-400">Avaliação comportamental DISC</p>
        </div>
      </div>

      {!link ? (
        <button
          onClick={gerarLink}
          disabled={carregando || !empresaId}
          className="bg-indigo-600 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60"
        >
          {carregando ? 'Gerando...' : 'Gerar link'}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1.5 break-all">
            {link}
          </p>
          <div className="flex gap-2">
            <button
              onClick={enviarWhatsapp}
              className="flex-1 bg-green-600 text-white text-xs font-medium rounded-lg py-2"
            >
              📱 WhatsApp
            </button>
            <button
              onClick={copiarLink}
              className="flex-1 border text-xs font-medium rounded-lg py-2"
            >
              🔗 Copiar
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-red-600 text-xs">{erro}</p>}
    </div>
  )
}
