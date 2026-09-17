'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import BannerCandidato from '@/components/BannerCandidato'
import { PERGUNTAS_SAIDA } from '@/lib/perguntasSaida'

export default function PesquisaSaidaClient({
  colaboradorId,
  nomeColaborador,
  nomeEmpresa,
  jaRespondeu,
}: {
  colaboradorId: string
  nomeColaborador: string
  nomeEmpresa: string
  jaRespondeu: boolean
}) {
  const [indice, setIndice] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(jaRespondeu)
  const supabase = createClient()

  const pergunta = PERGUNTAS_SAIDA[indice]
  const progresso = Math.round(((indice + (concluido ? 1 : 0)) / PERGUNTAS_SAIDA.length) * 100)

  async function responder(opcao: string) {
    setEnviando(true)
    await supabase.from('respostas_saida').insert({
      colaborador_id: colaboradorId,
      ordem: pergunta.ordem,
      pergunta: pergunta.texto,
      resposta: opcao,
    })
    setEnviando(false)

    if (indice + 1 < PERGUNTAS_SAIDA.length) {
      setIndice(indice + 1)
    } else {
      setConcluido(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <BannerCandidato subtitulo={`${nomeEmpresa} • Pesquisa de saída`} />
        <div className="p-6">
          {concluido ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-2">🙏</p>
              <p className="text-sm font-medium mb-1">Obrigado pela sua sinceridade, {nomeColaborador.split(' ')[0]}!</p>
              <p className="text-xs text-gray-500">Seu feedback é muito importante pra empresa melhorar.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Pergunta {indice + 1} de {PERGUNTAS_SAIDA.length}</span>
                <span>{progresso}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progresso}%` }} />
              </div>

              <p className="text-sm font-medium mb-4">{pergunta.texto}</p>

              <div className="flex flex-col gap-2">
                {pergunta.opcoes.map((opcao) => (
                  <button
                    key={opcao}
                    onClick={() => responder(opcao)}
                    disabled={enviando}
                    className="text-left border rounded-lg px-3 py-2.5 text-sm hover:border-indigo-400 hover:bg-indigo-50 transition disabled:opacity-60"
                  >
                    {opcao}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
