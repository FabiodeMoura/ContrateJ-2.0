'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

interface Empresa {
  id: string
  nome_fantasia: string
}

export default function AdicionarColaboradorButton({ empresas }: { empresas: Empresa[] }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function salvar() {
    if (!nome || !empresaId) return
    setSalvando(true)
    setErro(null)

    const { error } = await supabase.from('colaboradores').insert({
      empresa_id: empresaId,
      nome_completo: nome,
      email: email || null,
      cpf: cpf || null,
      status: 'Ativo',
    })

    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar. Tente novamente.')
      return
    }

    setAberto(false)
    setNome('')
    setEmail('')
    setCpf('')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="border bg-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full md:w-auto"
      >
        + Adicionar colaborador
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-sm mb-3">Adicionar colaborador</p>

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
              placeholder="CPF"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />

            <p className="text-xs text-gray-500 mb-1.5">Empresa</p>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
              ))}
            </select>

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
                disabled={salvando || !nome || !empresaId}
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
