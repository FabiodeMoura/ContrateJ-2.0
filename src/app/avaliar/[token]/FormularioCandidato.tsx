'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import BannerCandidato from '@/components/BannerCandidato'

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
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function iniciar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)

    try {
      // Gera o ID no próprio navegador: candidatos anônimos podem CRIAR
      // o próprio registro (RLS), mas não podem LER de volta o que criaram,
      // então não dá pra depender de ".select().single()" pra pegar o ID.
      const candidatoId = crypto.randomUUID()

      const { error } = await supabase
        .from('candidatos')
        .insert({
          id: candidatoId,
          vaga_id: vagaId,
          nome_completo: nome,
          email,
          whatsapp,
        })

      setCarregando(false)

      if (error) {
        // Mostra o motivo real (RLS, campo obrigatório, etc.) em vez de um alerta genérico
        setErro(error.message ?? 'Não foi possível iniciar a avaliação. Tente novamente.')
        console.error('Erro ao criar candidato:', error)
        return
      }

      router.push(`/quiz/${token}?candidato=${candidatoId}`)
    } catch (e) {
      setCarregando(false)
      setErro('Erro de conexão. Verifique sua internet e tente novamente.')
      console.error('Erro inesperado ao iniciar avaliação:', e)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <BannerCandidato subtitulo={`${nomeEmpresa} • Vaga: ${funcao}`} />
        <div className="p-6">
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
          {erro && (
            <p className="text-red-600 text-xs bg-red-50 rounded-md px-3 py-2">{erro}</p>
          )}
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
    </div>
  )
}
