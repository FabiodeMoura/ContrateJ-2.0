'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import BannerCandidato from '@/components/BannerCandidato'

interface Pergunta {
  id: string
  ordem: number
  texto_pergunta: string
  opcao_d: string
  opcao_i: string
  opcao_s: string
  opcao_c: string
}

export default function QuizClient({
  token,
  candidatoId,
  funcao,
  nomeEmpresa,
  perguntas,
}: {
  token: string
  candidatoId: string
  funcao: string
  nomeEmpresa: string
  perguntas: Pergunta[]
}) {
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<{ perguntaId: string; letra: 'D' | 'I' | 'S' | 'C' }[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const perguntaAtual = perguntas[indice]
  const progresso = Math.round(((indice + 1) / perguntas.length) * 100)

  async function finalizar(novasRespostas: { perguntaId: string; letra: 'D' | 'I' | 'S' | 'C' }[]) {
    setEnviando(true)
    setErro(null)

    const linhas = novasRespostas.map((r) => ({
      candidato_id: candidatoId,
      pergunta_id: r.perguntaId,
      opcao_escolhida: r.letra,
    }))

    // 1. Salva TODAS as respostas primeiro e só continua se der certo
    const { error: erroRespostas } = await supabase.from('respostas_candidato').insert(linhas)

    if (erroRespostas) {
      setEnviando(false)
      setErro('Não conseguimos salvar suas respostas. Verifique sua internet e tente novamente.')
      return
    }

    // 2. Só calcula a aderência depois de confirmar que as respostas foram salvas
    const { error: erroCalculo } = await supabase.rpc('calcular_aderencia', { p_candidato_id: candidatoId })

    if (erroCalculo) {
      setEnviando(false)
      setErro('Suas respostas foram salvas, mas houve um erro ao calcular o resultado. Toque em "Tentar novamente".')
      return
    }

    router.push(`/resultado/${candidatoId}`)
  }

  async function escolher(letra: 'D' | 'I' | 'S' | 'C') {
    const novasRespostas = [...respostas, { perguntaId: perguntaAtual.id, letra }]
    setRespostas(novasRespostas)

    if (indice + 1 < perguntas.length) {
      setIndice(indice + 1)
      return
    }

    await finalizar(novasRespostas)
  }

  if (!perguntaAtual) {
    return <p className="text-center p-10 text-sm text-gray-500">Carregando perguntas...</p>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <BannerCandidato subtitulo={`${nomeEmpresa} • Vaga: ${funcao}`} />
        <div className="p-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Pergunta {indice + 1} de {perguntas.length}</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>

        <p className="text-sm font-medium mb-4">{perguntaAtual.texto_pergunta}</p>

        <div className="flex flex-col gap-2">
          {enviando ? (
            <p className="text-sm text-gray-500 text-center py-4">Calculando seu resultado...</p>
          ) : erro ? (
            <div className="text-center py-2">
              <p className="text-red-600 text-xs mb-3">{erro}</p>
              <button
                onClick={() => finalizar(respostas)}
                className="w-full bg-indigo-600 text-white rounded-md py-2.5 text-sm font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => escolher('D')} className="text-left border rounded-lg px-3 py-2.5 text-sm hover:border-indigo-400 hover:bg-indigo-50 transition">
                {perguntaAtual.opcao_d}
              </button>
              <button onClick={() => escolher('I')} className="text-left border rounded-lg px-3 py-2.5 text-sm hover:border-indigo-400 hover:bg-indigo-50 transition">
                {perguntaAtual.opcao_i}
              </button>
              <button onClick={() => escolher('S')} className="text-left border rounded-lg px-3 py-2.5 text-sm hover:border-indigo-400 hover:bg-indigo-50 transition">
                {perguntaAtual.opcao_s}
              </button>
              <button onClick={() => escolher('C')} className="text-left border rounded-lg px-3 py-2.5 text-sm hover:border-indigo-400 hover:bg-indigo-50 transition">
                {perguntaAtual.opcao_c}
              </button>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
