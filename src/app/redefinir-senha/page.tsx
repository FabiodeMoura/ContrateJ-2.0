'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { MARCA } from '@/lib/frases'
import LogoMarca from '@/components/LogoMarca'

function RedefinirSenhaConteudo() {
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [validandoLink, setValidandoLink] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // O link do e-mail pode vir com "?code=" (fluxo mais novo) — se vier,
  // trocamos esse código por uma sessão de verdade antes de deixar a
  // pessoa criar a nova senha.
  useEffect(() => {
    async function validarLink() {
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Erro ao validar link de recuperação:', error)
          setErro(error.message)
        }
      } else {
        // Sem "code" na URL: verifica se já existe uma sessão válida
        // (caso o link tenha usado o formato antigo, baseado em #hash)
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          setErro('Link inválido ou incompleto. Solicite um novo na tela de login.')
        }
      }
      setValidandoLink(false)
    }
    validarLink()
  }, [])

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
      console.error('Erro ao atualizar senha:', error)
      setErro(error.message || 'Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.')
      return
    }

    setSucesso(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-teal-600 to-lime-400 px-6 py-6 text-center">
          <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-6 w-24 h-24 rounded-full bg-white/10" />
          <img src="/logo-icon.png" alt="" className="relative w-10 h-10 rounded-xl mx-auto mb-2 object-contain" />
          <div className="relative flex justify-center"><LogoMarca altura={26} /></div>
        </div>

        <div className="p-6">
          {sucesso ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-medium">Senha atualizada!</p>
              <p className="text-xs text-gray-500 mt-1">Redirecionando pro painel...</p>
            </div>
          ) : validandoLink ? (
            <p className="text-sm text-gray-500 text-center py-4">Verificando link...</p>
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

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaConteudo />
    </Suspense>
  )
}
