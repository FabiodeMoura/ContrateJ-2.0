'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function AcaoColaborador({
  id,
  status,
  linkSaidaExistente,
}: {
  id: string
  status: string
  linkSaidaExistente?: string | null
}) {
  const [modalAberto, setModalAberto] = useState(false)
  const [tipo, setTipo] = useState<'Pediu demissão' | 'Foi demitido'>('Pediu demissão')
  const [salvando, setSalvando] = useState(false)
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function reativar() {
    await supabase
      .from('colaboradores')
      .update({ status: 'Ativo', desligado_em: null, tipo_desligamento: null })
      .eq('id', id)
    router.refresh()
  }

  async function confirmarDesligamento() {
    setSalvando(true)

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${baseUrl}/saida/${id}`

    await supabase
      .from('colaboradores')
      .update({
        status: 'Desligado',
        desligado_em: new Date().toISOString(),
        tipo_desligamento: tipo,
        link_entrevista_saida: link,
      })
      .eq('id', id)

    setSalvando(false)
    setLinkGerado(link)
  }

  function fecharTudo() {
    setModalAberto(false)
    setLinkGerado(null)
    router.refresh()
  }

  function enviarWhatsapp(link: string) {
    const texto = `Olá! Antes de encerrarmos, gostaríamos muito de ouvir sua opinião sobre sua passagem pela empresa. Pode responder essa breve pesquisa? ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (status === 'Ativo') {
    return (
      <>
        <button
          onClick={() => setModalAberto(true)}
          className="text-xs font-medium rounded-full px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100"
        >
          Desligar
        </button>

        {modalAberto && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
            onClick={() => !linkGerado && setModalAberto(false)}
          >
            <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              {!linkGerado ? (
                <>
                  <p className="font-medium text-sm mb-3">Confirmar desligamento</p>
                  <p className="text-xs text-gray-500 mb-3">Isso conta no turnover. Qual foi o motivo?</p>

                  <div className="flex flex-col gap-2 mb-4">
                    <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer">
                      <input type="radio" checked={tipo === 'Pediu demissão'} onChange={() => setTipo('Pediu demissão')} />
                      Pediu demissão
                    </label>
                    <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer">
                      <input type="radio" checked={tipo === 'Foi demitido'} onChange={() => setTipo('Foi demitido')} />
                      Foi demitido
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setModalAberto(false)} className="flex-1 border rounded-lg py-2 text-sm">
                      Cancelar
                    </button>
                    <button
                      onClick={confirmarDesligamento}
                      disabled={salvando}
                      className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
                    >
                      {salvando ? 'Salvando...' : 'Confirmar'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-medium text-sm mb-1">✅ Desligamento registrado</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Que tal ouvir o feedback dele(a)? Envie a pesquisa de saída (10 perguntas):
                  </p>
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1.5 break-all mb-3">
                    {linkGerado}
                  </p>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => enviarWhatsapp(linkGerado)}
                      className="flex-1 bg-green-600 text-white text-xs font-medium rounded-lg py-2"
                    >
                      📱 Enviar
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(linkGerado); alert('Link copiado!') }}
                      className="flex-1 border text-xs font-medium rounded-lg py-2"
                    >
                      🔗 Copiar
                    </button>
                  </div>
                  <button onClick={fecharTudo} className="w-full text-xs text-gray-400 py-1">
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={reativar}
        className="text-xs font-medium rounded-full px-2.5 py-1 bg-green-50 text-green-600 hover:bg-green-100"
      >
        Reativar
      </button>
      {linkSaidaExistente && (
        <a href={linkSaidaExistente} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-indigo-600" title="Ver link da pesquisa de saída">
          🔗
        </a>
      )}
    </div>
  )
}
