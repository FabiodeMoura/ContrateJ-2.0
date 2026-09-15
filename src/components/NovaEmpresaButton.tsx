'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const SEGMENTOS = ['Restaurante', 'Bar', 'Lanchonete', 'Padaria', 'Sacolão', 'Pizzaria']

export default function NovaEmpresaButton() {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [segmento, setSegmento] = useState(SEGMENTOS[0])
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function criarEmpresa() {
    setCriando(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCriando(false)
      setErro('Sessão expirada, faça login novamente.')
      return
    }

    const { error } = await supabase.from('empresas').insert({
      dono_id: user.id,
      nome_fantasia: nome,
      segmento_principal: segmento,
    })

    setCriando(false)

    if (error) {
      setErro('Não foi possível cadastrar a empresa. Tente novamente.')
      return
    }

    setAberto(false)
    setNome('')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/10 transition w-full text-left border border-dashed border-white/30 mt-2"
      >
        <span>➕</span>
        <span>Nova empresa</span>
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div
            className="bg-white rounded-xl p-5 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium text-sm mb-3">Cadastrar nova empresa</p>

            <input
              type="text"
              autoFocus
              placeholder="Nome fantasia"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <p className="text-xs text-gray-500 mb-1.5">Segmento</p>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
            >
              {SEGMENTOS.map((s) => (
                <option key={s} value={s}>{s}</option>
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
                onClick={criarEmpresa}
                disabled={criando || !nome}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
              >
                {criando ? 'Criando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
