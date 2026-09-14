'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { MARCA } from '@/lib/frases'

export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais.')
      return
    }

    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setCarregando(false)

    if (error) {
      setErro('Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.')
      return
    }

    setSucesso(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 px-6 py-6 text-center">
          <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative w-10 h-10 rounded-xl bg-white/15 mx-auto mb-2 flex items-center justify-center text-lg">
            💼
          </div>
          <p className="relative text-white font-bold text-xl tracking-tight">{MARCA.nome}</p>
        </div>

        <div className="p-6">
          {sucesso ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-medium">Senha atualizada!</p>
              <p className="text-xs text-gray-500 mt-1">Redirecionando pro painel...</p>
            </div>
          ) : (
            <form onSubmit={salvar} className="space-y-3">
              <h2 className="text-lg font-semibold">Criar nova senha</h2>
              <input
                type="password"
                required
                placeholder="Nova senha"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="Confirme a nova senha"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
              {erro && <p className="text-red-600 text-xs">{erro}</p>}
              <button
                disabled={carregando}
                className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium disabled:opacity-60"
              >
                {carregando ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
