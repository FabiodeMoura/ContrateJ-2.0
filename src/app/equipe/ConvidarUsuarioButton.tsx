'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function ConvidarUsuarioButton({
  empresas,
  empresaIdPadrao,
  limitePorEmpresa,
}: {
  empresas: { id: string; nome_fantasia: string; usados: number }[]
  empresaIdPadrao: string
  limitePorEmpresa: number | null // null = sem limite
}) {
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [empresaId, setEmpresaId] = useState(empresaIdPadrao)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const cheia = (usados: number) => limitePorEmpresa !== null && usados >= limitePorEmpresa
  const empresaAtual = empresas.find((e) => e.id === empresaId)

  async function convidar() {
    if (!email || !empresaId) return
    setSalvando(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSalvando(false)
      setErro('Sessão expirada, faça login novamente.')
      return
    }

    const { error } = await supabase.from('equipe').insert({
      dono_id: user.id,
      empresa_id: empresaId,
      membro_email: email.trim().toLowerCase(),
    })

    setSalvando(false)

    if (error) {
      if (error.code === '23505') setErro('Esse e-mail já foi cadastrado nesta empresa.')
      else if (error.code === 'EQ003') setErro('Esta empresa já tem o máximo de usuários do plano.')
      else if (error.code === 'EQ002') setErro('O plano Gratuito não permite cadastrar usuários. Veja a aba "Planos".')
      else setErro('Não foi possível cadastrar o usuário. Tente novamente.')
      return
    }

    setAberto(false)
    setEmail('')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEmpresaId(empresaIdPadrao)
          setErro(null)
          setAberto(true)
        }}
        className="text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100"
      >
        + Cadastrar usuário
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-sm mb-1">Cadastrar usuário</p>
            <p className="text-xs text-gray-500 mb-3">
              A pessoa deve criar uma conta no ContrateJá usando esse mesmo e-mail. Assim que ela se cadastrar, o acesso é liberado automaticamente, somente para a empresa escolhida.
            </p>

            <label className="text-[11px] text-gray-500 mb-1 block">Vincular a qual empresa?</label>
            {empresas.length > 1 ? (
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id} disabled={cheia(e.usados)}>
                    {e.nome_fantasia}
                    {limitePorEmpresa !== null ? ` (${e.usados}/${limitePorEmpresa})` : ''}
                    {cheia(e.usados) ? ' — completa' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium mb-3">{empresaAtual?.nome_fantasia}</p>
            )}

            <input
              type="email"
              autoFocus
              placeholder="email@exemplo.com"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {erro && <p className="text-red-600 text-xs mb-3">{erro}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setAberto(false)} className="flex-1 border rounded-lg py-2 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={convidar}
                disabled={salvando || !email || !empresaId}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
