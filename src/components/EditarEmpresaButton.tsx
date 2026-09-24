'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { apenasDigitos, formatarCnpj, cnpjValido } from '@/lib/validarCnpj'

const SEGMENTOS = ['Restaurante', 'Bar', 'Lanchonete', 'Padaria', 'Sacolão', 'Pizzaria']

interface Empresa {
  id: string
  nome_fantasia: string
  segmento_principal: string | null
  cnpj: string | null
  logo_url: string | null
}

export default function EditarEmpresaButton({ empresa }: { empresa: Empresa }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState(empresa.nome_fantasia)
  const [cnpj, setCnpj] = useState(formatarCnpj(empresa.cnpj ?? ''))
  const [segmento, setSegmento] = useState(empresa.segmento_principal ?? SEGMENTOS[0])
  const [logoUrl, setLogoUrl] = useState(empresa.logo_url ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function salvar() {
    setSalvando(true)
    setErro(null)

    const cnpjLimpo = apenasDigitos(cnpj)
    if (!cnpjValido(cnpjLimpo)) {
      setSalvando(false)
      setErro('Informe um CNPJ válido.')
      return
    }

    const { error } = await supabase
      .from('empresas')
      .update({
        nome_fantasia: nome.trim(),
        segmento_principal: segmento,
        cnpj: cnpjLimpo,
        logo_url: logoUrl.trim() || null,
      })
      .eq('id', empresa.id)

    setSalvando(false)

    if (error) {
      console.error('Erro ao editar empresa:', error)
      setErro(
        error.code === '23505'
          ? 'Esse CNPJ já está cadastrado em outra conta.'
          : `Não foi possível salvar: ${error.message}`
      )
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
        className="text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100 whitespace-nowrap"
      >
        Editar
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-sm mb-3">Editar empresa</p>

            <label className="text-[11px] text-gray-500 mb-1 block">Nome fantasia</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <label className="text-[11px] text-gray-500 mb-1 block">CNPJ</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={cnpj}
              onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
            />

            <label className="text-[11px] text-gray-500 mb-1 block">Segmento</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
            >
              {SEGMENTOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label className="text-[11px] text-gray-500 mb-1 block">Link da logo (opcional)</label>
            <input
              type="text"
              placeholder="https://..."
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />

            {erro && <p className="text-red-600 text-xs mb-3">{erro}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={() => setAberto(false)} className="flex-1 border rounded-lg py-2 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !nome.trim()}
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
