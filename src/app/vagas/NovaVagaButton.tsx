'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { verificarEIncrementarUso } from '@/lib/usoLinks'

export default function NovaVagaButton({
  empresas,
  empresaIdPadrao,
  perfis,
}: {
  empresas: { id: string; nome_fantasia: string }[]
  empresaIdPadrao: string
  perfis: { id: string; funcao: string }[]
}) {
  const [aberto, setAberto] = useState(false)
  const [empresaEscolhida, setEmpresaEscolhida] = useState(empresaIdPadrao)
  const [perfilId, setPerfilId] = useState(perfis[0]?.id ?? '')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function criarVaga() {
    setCriando(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCriando(false)
      setErro('Sessão expirada. Atualize a página e faça login novamente.')
      return
    }

    const uso = await verificarEIncrementarUso(supabase, user.id, empresaEscolhida)
    if (!uso) {
      setCriando(false)
      setErro('Não foi possível verificar o seu plano agora. Atualize a página e tente novamente.')
      return
    }
    if (!uso.permitido) {
      setCriando(false)
      setErro(`Limite de ${uso.limite_total} links atingido. Veja a aba "Planos" pra continuar gerando.`)
      return
    }

    const perfil = perfis.find((p) => p.id === perfilId)

    const { error } = await supabase.from('vagas').insert({
      empresa_id: empresaEscolhida,
      perfil_disc_id: perfilId,
      funcao: perfil?.funcao ?? '',
    })

    setCriando(false)
    if (!error) {
      setAberto(false)
      // Se a vaga foi criada para outra empresa, mostra a lista dela.
      if (empresaEscolhida !== empresaIdPadrao) {
        router.push(`/vagas?empresa=${empresaEscolhida}`)
      } else {
        router.refresh()
      }
    } else {
      setErro('Não foi possível criar a vaga. Tente novamente.')
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setEmpresaEscolhida(empresaIdPadrao)
          setAberto(true)
        }}
        className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full sm:w-auto"
      >
        + Nova vaga
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-xs">
            {empresas.length > 1 && (
              <>
                <p className="font-medium text-sm mb-3">Para qual empresa é a vaga?</p>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
                  value={empresaEscolhida}
                  onChange={(e) => setEmpresaEscolhida(e.target.value)}
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                  ))}
                </select>
              </>
            )}
            <p className="font-medium text-sm mb-3">Selecione a função</p>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              value={perfilId}
              onChange={(e) => setPerfilId(e.target.value)}
            >
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>{p.funcao}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setAberto(false)}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={criarVaga}
                disabled={criando || !empresaEscolhida}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
              >
                {criando ? 'Criando...' : 'Gerar link'}
              </button>
            </div>
            {erro && (
              <div className="mt-3">
                <p className="text-red-600 text-xs">{erro}</p>
                {erro.includes('Limite') && (
                  <a href="/planos" className="text-xs text-indigo-600 font-medium hover:underline">
                    Ver planos →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
