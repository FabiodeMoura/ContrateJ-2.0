'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function GerarLinkCard({
  perfilId,
  funcao,
  empresaId,
  nomeEmpresa,
}: {
  perfilId: string
  funcao: string
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

  function copiarLink() {
    if (!link) return
    navigator.clipboard.writeText(link)
    alert('Link copiado!')
  }

  function enviarWhatsapp() {
    if (!link) return
    const texto = `Olá! Você foi convidado a participar do processo seletivo de ${funcao} na ${nomeEmpresa}. Acesse o link para responder a avaliação: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-3">
      <div>
        <p className="font-medium text-sm">{funcao}</p>
        <p className="text-xs text-gray-400">Avaliação comportamental DISC</p>
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
