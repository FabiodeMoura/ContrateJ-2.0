'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

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
  const router = useRouter()
  const supabase = createClient()

  const perguntaAtual = perguntas[indice]
  const progresso = Math.round(((indice + 1) / perguntas.length) * 100)

  async function escolher(letra: 'D' | 'I' | 'S' | 'C') {
    const novasRespostas = [...respostas, { perguntaId: perguntaAtual.id, letra }]
    setRespostas(novasRespostas)

    if (indice + 1 < perguntas.length) {
      setIndice(indice + 1)
      return
    }

    // Última pergunta — grava tudo e calcula o resultado
    setEnviando(true)

    const linhas = novasRespostas.map((r) => ({
      candidato_id: candidatoId,
      pergunta_id: r.perguntaId,
      opcao_escolhida: r.letra,
    }))

    await supabase.from('respostas_candidato').insert(linhas)
    await supabase.rpc('calcular_aderencia', { p_candidato_id: candidatoId })

    router.push(`/resultado/${candidatoId}`)
  }

  if (!perguntaAtual) {
    return <p className="text-center p-10 text-sm text-gray-500">Carregando perguntas...</p>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="text-center pb-4 mb-5 border-b">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 mx-auto mb-2 flex items-center justify-center text-white">
            💼
          </div>
          <p className="font-semibold text-sm">ContrateJá</p>
          <p className="text-xs text-gray-500 mt-1">
            {nomeEmpresa} • Vaga: {funcao}
          </p>
        </div>

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
  )
}
