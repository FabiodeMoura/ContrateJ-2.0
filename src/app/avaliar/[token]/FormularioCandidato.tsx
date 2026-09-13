'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function FormularioCandidato({
  vagaId,
  funcao,
  nomeEmpresa,
  token,
}: {
  vagaId: string
  funcao: string
  nomeEmpresa: string
  token: string
}) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function iniciar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)

    const { data, error } = await supabase
      .from('candidatos')
      .insert({
        vaga_id: vagaId,
        nome_completo: nome,
        email,
        whatsapp,
      })
      .select('id')
      .single()

    setCarregando(false)
    if (error || !data) {
      alert('Não foi possível iniciar a avaliação. Tente novamente.')
      return
    }

    router.push(`/quiz/${token}?candidato=${data.id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 mx-auto mb-2 flex items-center justify-center text-white">
            💼
          </div>
          <p className="font-semibold text-sm">ContrateJá</p>
          <p className="text-xs text-gray-500 mt-1">
            {nomeEmpresa} • Vaga: {funcao}
          </p>
        </div>

        <p className="text-sm font-medium mb-3">
          Antes de começar, precisamos de alguns dados
        </p>

        <form onSubmit={iniciar} className="space-y-3">
          <input
            required
            placeholder="Nome completo"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            required
            type="tel"
            placeholder="WhatsApp com DDD"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <button
            disabled={carregando}
            className="w-full bg-indigo-600 text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {carregando ? 'Iniciando...' : 'Iniciar avaliação'}
          </button>
        </form>
        <p className="text-[11px] text-gray-400 text-center mt-3">
          Você só poderá responder uma vez
        </p>
      </div>
    </div>
  )
}
