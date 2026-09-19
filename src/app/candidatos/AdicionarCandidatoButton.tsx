'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

interface Vaga {
  id: string
  funcao: string
}

export default function AdicionarCandidatoButton({ vagas }: { vagas: Vaga[] }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [vagaId, setVagaId] = useState(vagas[0]?.id ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function salvar() {
    if (!nome || !email || !whatsapp || !vagaId) return
    setSalvando(true)
    setErro(null)

    const { error } = await supabase.from('candidatos').insert({
      vaga_id: vagaId,
      nome_completo: nome,
      email,
      whatsapp,
      status: 'Em análise',
    })

    setSalvando(false)

    if (error) {
      console.error('Erro ao cadastrar candidato:', error)
      setErro(`Não foi possível salvar: ${error.message}`)
      return
    }

    setAberto(false)
    setNome('')
    setEmail('')
    setWhatsapp('')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={vagas.length === 0}
        className="border bg-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
        title={vagas.length === 0 ? 'Crie uma vaga antes de cadastrar candidatos' : ''}
      >
        + Cadastrar candidato
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-sm mb-3">Cadastrar candidato</p>

            <input
              type="text"
              autoFocus
              placeholder="Nome completo"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              type="email"
              placeholder="E-mail"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="WhatsApp"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />

            <p className="text-xs text-gray-500 mb-1.5">Vaga</p>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              value={vagaId}
              onChange={(e) => setVagaId(e.target.value)}
            >
              {vagas.map((v) => (
                <option key={v.id} value={v.id}>{v.funcao}</option>
              ))}
            </select>

            <p className="text-[11px] text-gray-400 mb-3">
              O candidato entra na lista sem avaliação DISC ainda — envie o link do questionário
              pela tela de Vagas quando quiser avaliá-lo.
            </p>

            {erro && <p className="text-red-600 text-xs mb-3">{erro}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !nome || !email || !whatsapp || !vagaId}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
