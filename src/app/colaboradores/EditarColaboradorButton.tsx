'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

interface Empresa {
  id: string
  nome_fantasia: string
}

export default function EditarColaboradorButton({
  id,
  nomeAtual,
  emailAtual,
  whatsappAtual,
  cpfAtual,
  funcaoAtual,
  empresaIdAtual,
  empresas,
}: {
  id: string
  nomeAtual: string
  emailAtual: string | null
  whatsappAtual: string | null
  cpfAtual: string | null
  funcaoAtual: string | null
  empresaIdAtual: string
  empresas: Empresa[]
}) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState(nomeAtual)
  const [email, setEmail] = useState(emailAtual ?? '')
  const [whatsapp, setWhatsapp] = useState(whatsappAtual ?? '')
  const [cpf, setCpf] = useState(cpfAtual ?? '')
  const [funcao, setFuncao] = useState(funcaoAtual ?? '')
  const [empresaId, setEmpresaId] = useState(empresaIdAtual)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function salvar() {
    if (!nome || !empresaId) return
    setSalvando(true)
    setErro(null)

    const { error } = await supabase
      .from('colaboradores')
      .update({
        nome_completo: nome,
        email: email || null,
        whatsapp: whatsapp || null,
        cpf: cpf || null,
        funcao: funcao || null,
        empresa_id: empresaId,
      })
      .eq('id', id)

    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar. Tente novamente.')
      return
    }

    setAberto(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-gray-400 hover:text-indigo-600 transition"
        title="Editar colaborador"
      >
        ✏️
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-sm mb-3">Editar colaborador</p>

            <input
              type="text"
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
            <input
              type="text"
              placeholder="CPF"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
            <input
              type="text"
              placeholder="Função"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
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
