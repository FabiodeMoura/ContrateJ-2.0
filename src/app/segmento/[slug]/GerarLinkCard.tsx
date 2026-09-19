'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { verificarEIncrementarUso } from '@/lib/usoLinks'

interface Empresa {
  id: string
  nome_fantasia: string
}

export default function GerarLinkCard({
  perfilId,
  funcao,
  icone,
  empresas,
  empresaIdPadrao,
}: {
  perfilId: string
  funcao: string
  icone: string
  empresas: Empresa[]
  empresaIdPadrao: string
}) {
  const [empresaEscolhida, setEmpresaEscolhida] = useState(empresaIdPadrao)
  const [carregando, setCarregando] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const supabase = createClient()

  const nomeEmpresaEscolhida = empresas.find((e) => e.id === empresaEscolhida)?.nome_fantasia ?? ''

  async function gerarLink() {
    if (!empresaEscolhida) return
    setCarregando(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCarregando(false)
      setErro('Sessão expirada. Atualize a página e faça login novamente.')
      return
    }

    const uso = await verificarEIncrementarUso(supabase, user.id)
    if (!uso) {
      setCarregando(false)
      setErro('Não foi possível verificar o seu plano agora. Atualize a página e tente novamente.')
      return
    }
    if (!uso.permitido) {
      setCarregando(false)
      setErro(`Você atingiu o limite de ${uso.limite_total} links do seu plano. Faça upgrade na aba "Planos".`)
      return
    }

    const { data, error } = await supabase
      .from('vagas')
      .insert({ empresa_id: empresaEscolhida, perfil_disc_id: perfilId, funcao })
      .select('token_link')
      .single()

    setCarregando(false)

    if (error || !data) {
      setErro('Não foi possível gerar o link. Tente novamente.')
      return
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    setLink(`${baseUrl}/avaliar/${data.token_link}`)
  }

  function mensagemPadrao() {
    return `Olá! Você foi convidado a participar do processo seletivo de ${funcao} na ${nomeEmpresaEscolhida}. Acesse o link para responder a avaliação: ${link}`
  }

  function copiarLink() {
    if (!link) return
    navigator.clipboard.writeText(mensagemPadrao())
    alert('Mensagem copiada!')
  }

  function enviarWhatsapp() {
    if (!link) return
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagemPadrao())}`, '_blank')
  }

  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-lg shrink-0">
          {icone}
        </div>
        <div>
          <p className="font-medium text-sm">{funcao}</p>
          <p className="text-xs text-gray-400">Avaliação comportamental DISC</p>
        </div>
      </div>

      {!link ? (
        <>
          {empresas.length > 1 && (
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Gerar para qual empresa?</label>
              <select
                value={empresaEscolhida}
                onChange={(e) => setEmpresaEscolhida(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={gerarLink}
            disabled={carregando || !empresaEscolhida}
            className="bg-indigo-600 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60"
          >
            {carregando ? 'Gerando...' : 'Gerar link'}
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-gray-400">Empresa: <span className="font-medium text-gray-600">{nomeEmpresaEscolhida}</span></p>
          <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1.5 break-all">
            {link}
          </p>
          <div className="flex gap-2">
            <button
              onClick={enviarWhatsapp}
              className="flex-1 bg-green-600 text-white text-xs font-medium rounded-lg py-2"
            >
              📱 WhatsApp
            </button>
            <button
              onClick={copiarLink}
              className="flex-1 border text-xs font-medium rounded-lg py-2"
            >
              🔗 Copiar
            </button>
          </div>
        </div>
      )}

      {erro && (
        <div>
          <p className="text-red-600 text-xs">{erro}</p>
          {erro.includes('limite') && (
            <a href="/planos" className="text-xs text-indigo-600 font-medium hover:underline">
              Ver planos →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
