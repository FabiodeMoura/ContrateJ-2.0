'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function ConvidarUsuarioButton() {
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function convidar() {
    if (!email) return
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
      membro_email: email.trim().toLowerCase(),
    })

    setSalvando(false)

    if (error) {
      setErro(error.code === '23505' ? 'Esse e-mail já foi convidado.' : 'Não foi possível convidar. Tente novamente.')
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
        onClick={() => setAberto(true)}
        className="text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100"
      >
        + Convidar usuário
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-sm mb-1">Convidar usuário</p>
            <p className="text-xs text-gray-500 mb-3">
              A pessoa deve criar uma conta no ContrateJá usando esse mesmo e-mail. Assim que ela se cadastrar, o acesso é liberado automaticamente.
            </p>
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
                disabled={salvando || !email}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
              >
                {salvando ? 'Enviando...' : 'Convidar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
