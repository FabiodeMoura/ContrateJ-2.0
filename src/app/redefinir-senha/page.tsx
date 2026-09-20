'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import LogoMarca from '@/components/LogoMarca'

export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [validandoLink, setValidandoLink] = useState(true)
  const [temSessao, setTemSessao] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Valida o link de recuperação. Aceita os formatos que o Supabase pode mandar:
  // "#access_token=..." (funciona em qualquer navegador/aparelho), "?code=..." e "?token_hash=...".
  // O formulário de nova senha só aparece quando existe uma sessão de recuperação válida.
  useEffect(() => {
    async function validar() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const query = new URLSearchParams(window.location.search)

        // 0) O próprio Supabase avisou que o link não vale mais (expirou ou já foi usado)
        if (hashParams.get('error') || hashParams.get('error_code') || query.get('error') || query.get('error_code')) {
          setErro('Este link expirou ou já foi usado. Volte ao login e peça um novo link.')
          return
        }

        // 1) Link no formato "#access_token=..."
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) {
            console.error('Erro ao criar sessão a partir do link:', error)
            setErro('Não foi possível validar o link. Volte ao login e peça um novo.')
            return
          }
          window.history.replaceState(null, '', window.location.pathname)
          setTemSessao(true)
          return
        }

        // 2) Link no formato "?code=..." (só funciona no mesmo navegador em que o pedido foi feito)
        const code = query.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Erro ao trocar código por sessão:', error)
            setErro('Não foi possível validar o link. Volte ao login, peça um novo link e abra no mesmo aparelho e navegador.')
            return
          }
          window.history.replaceState(null, '', window.location.pathname)
          setTemSessao(true)
          return
        }

        // 3) Link no formato "?token_hash=...&type=recovery"
        const tokenHash = query.get('token_hash')
        if (tokenHash && query.get('type') === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
          if (error) {
            console.error('Erro ao validar token de recuperação:', error)
            setErro('Este link expirou ou já foi usado. Volte ao login e peça um novo link.')
            return
          }
          window.history.replaceState(null, '', window.location.pathname)
          setTemSessao(true)
          return
        }

        // 4) Nenhum formato veio na URL: confere se já existe uma sessão válida
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setTemSessao(true)
          return
        }
        setErro('Link inválido ou incompleto. Volte ao login e peça um novo link.')
      } finally {
        setValidandoLink(false)
      }
    }

    validar()
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
      if (/session missing/i.test(error.message)) {
        setTemSessao(false)
        setErro('O link de recuperação expirou. Volte ao login e peça um novo link.')
      } else {
        setErro(error.message || 'Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.')
      }
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
          ) : !temSessao ? (
            <div className="text-center py-2">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="text-sm font-medium mb-1">Não foi possível abrir este link</p>
              <p className="text-xs text-gray-500 mb-4">{erro}</p>
              <a
                href="/login"
                className="inline-block w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium"
              >
                Voltar ao login e pedir novo link
              </a>
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
