'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { createClient as criarClienteRecuperacao } from '@supabase/supabase-js'
import { MARCA, VALORES_LOGIN } from '@/lib/frases'
import LogoMarca from '@/components/LogoMarca'
import { apenasDigitos, formatarCnpj } from '@/lib/validarCnpj'

const SEGMENTOS = ['Restaurante', 'Bar', 'Lanchonete', 'Padaria', 'Sacolão', 'Pizzaria']

export default function LoginPage() {
  const [modo, setModo] = useState<'entrar' | 'cadastrar' | 'recuperar'>('entrar')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [aguardar, setAguardar] = useState(0) // segundos até poder pedir outro link
  const router = useRouter()
  const supabase = createClient()

  // Contagem regressiva do pedido de recuperação (o Supabase só aceita 1 pedido por minuto)
  useEffect(() => {
    if (aguardar <= 0) return
    const t = setTimeout(() => setAguardar((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [aguardar])

  // Campos de login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  // Campos extras de cadastro
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [segmento, setSegmento] = useState(SEGMENTOS[0])
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [cnpj, setCnpj] = useState('')

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)

    if (error) {
      setErro('E-mail ou senha inválidos.')
      return
    }
    router.push('/dashboard')
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const cnpjLimpo = cnpj ? apenasDigitos(cnpj) : null

    // 1. Cria o usuário no Supabase Auth. Os dados da empresa vão junto no
    // metadata — se a confirmação de e-mail estiver ativada, usamos isso
    // depois (em ProvisionarConta) pra criar a empresa só quando a pessoa
    // realmente confirmar o e-mail e fizer login pela primeira vez.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`,
        data: {
          nome: nomeResponsavel,
          empresa_pendente: nomeEmpresa,
          segmento_pendente: segmento,
          cnpj_pendente: cnpjLimpo,
        },
      },
    })

    if (error || !data.user) {
      setCarregando(false)
      setErro(error?.message ?? 'Não foi possível criar a conta.')
      return
    }

    // Sem sessão = confirmação de e-mail está ativada; a conta/empresa só
    // será criada depois que a pessoa confirmar e logar (ver ProvisionarConta.tsx)
    if (!data.session) {
      setCarregando(false)
      setSucesso('Quase lá! Enviamos um link de confirmação pro seu e-mail. Confirme pra liberar seu acesso.')
      return
    }

    // 2. Se esse e-mail foi convidado por alguém, entra direto na conta
    // dessa pessoa (mesma equipe) em vez de criar uma empresa nova.
    const { data: entrouComoConvidado } = await supabase.rpc('vincular_convite_equipe', {
      p_uid: data.user.id,
      p_email: email,
    })

    if (entrouComoConvidado) {
      setCarregando(false)
      router.push('/dashboard')
      return
    }

    // 3. Senão, cria a primeira empresa vinculada a esse usuário
    const { error: erroEmpresa } = await supabase.from('empresas').insert({
      dono_id: data.user.id,
      nome_fantasia: nomeEmpresa,
      segmento_principal: segmento,
      cnpj: cnpjLimpo,
    })

    setCarregando(false)

    if (erroEmpresa) {
      setErro(
        erroEmpresa.code === '23505'
          ? 'Esse CNPJ já está cadastrado em outra conta.'
          : 'Conta criada, mas houve um erro ao cadastrar a empresa: ' + erroEmpresa.message
      )
      return
    }

    router.push('/dashboard')
  }

  async function recuperarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (carregando || aguardar > 0) return // evita pedido duplicado (2 cliques seguidos)
    setCarregando(true)
    setErro(null)
    setSucesso(null)

    const origem = typeof window !== 'undefined' ? window.location.origin : ''
    // Cliente próprio, sem PKCE: o link do e-mail traz o acesso direto e abre em qualquer
    // navegador ou aparelho (o formato PKCE só funcionava no mesmo navegador do pedido).
    const clienteRecuperacao = criarClienteRecuperacao(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'sb-recuperacao-senha',
        },
      }
    )
    const { error } = await clienteRecuperacao.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${origem}/redefinir-senha`,
    })

    setCarregando(false)

    if (error) {
      console.error('Erro ao enviar recuperação de senha:', error)
      if (error.status === 429) {
        setAguardar(60)
        setErro('Você acabou de pedir um link. Aguarde 1 minuto e confira sua caixa de entrada e o spam.')
      } else {
        setErro(error.message || 'Não foi possível enviar o link. Confira o e-mail digitado.')
      }
      return
    }

    setAguardar(60)
    setSucesso('Se esse e-mail tiver conta, enviamos um link de recuperação. Confira também a caixa de spam.')
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — branding */}
      <div className="hidden md:flex md:flex-1 relative overflow-hidden bg-gradient-to-br from-slate-700 via-teal-600 to-lime-400 text-white p-10 flex-col justify-between">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute top-16 right-16 w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center text-3xl rotate-6 hidden sm:flex shadow-xl">
          🎯
        </div>
        <div className="absolute bottom-24 right-1/3 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-2xl -rotate-12 hidden lg:flex shadow-xl">
          ✅
        </div>
        <div className="absolute top-1/2 left-8 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl rotate-12 hidden lg:flex">
          👥
        </div>

        <div className="relative flex items-center gap-2">
          <img src="/logo-icon.png" alt="" className="w-10 h-10 rounded-xl object-contain" />
          <LogoMarca altura={26} />
        </div>

        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {MARCA.missao}
          </h1>
          <p className="text-base text-teal-50 max-w-sm">
            Avalie o perfil comportamental dos candidatos antes de chamar pra
            entrevista, com testes prontos pro seu segmento.
          </p>
          <div className="flex flex-col gap-2.5 mt-8">
            {VALORES_LOGIN.map((v) => (
              <div
                key={v.texto}
                className="flex items-center gap-3 text-sm font-medium bg-white/10 backdrop-blur rounded-xl px-3.5 py-2.5 w-fit"
              >
                <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-base shrink-0">
                  {v.icone}
                </span>
                {v.texto}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-teal-100">
          © {MARCA.nome} — {MARCA.tagline}
        </p>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {modo !== 'recuperar' && (
            <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  modo === 'entrar' ? 'bg-white shadow-sm' : 'text-gray-500'
                }`}
                onClick={() => { setModo('entrar'); setErro(null); setSucesso(null) }}
              >
                Entrar
              </button>
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  modo === 'cadastrar' ? 'bg-white shadow-sm' : 'text-gray-500'
                }`}
                onClick={() => { setModo('cadastrar'); setErro(null); setSucesso(null) }}
              >
                Criar conta
              </button>
            </div>
          )}

          {modo === 'entrar' && (
            <form onSubmit={entrar} className="space-y-3">
              <h2 className="text-lg font-semibold">Bem-vindo de volta</h2>
              <input
                type="email"
                required
                placeholder="voce@suaempresa.com"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="Senha"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setModo('recuperar'); setErro(null); setSucesso(null) }}
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              {erro && <p className="text-red-600 text-xs">{erro}</p>}
              <button
                disabled={carregando}
                className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium disabled:opacity-60"
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {modo === 'cadastrar' && (
            <form onSubmit={cadastrar} className="space-y-3">
              <h2 className="text-lg font-semibold">Cadastre sua empresa</h2>
              <input
                required
                placeholder="Nome da empresa"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
              />
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
              >
                {SEGMENTOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                required
                placeholder="Seu nome (responsável)"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={nomeResponsavel}
                onChange={(e) => setNomeResponsavel(e.target.value)}
              />
              <input
                placeholder="CNPJ (opcional)"
                inputMode="numeric"
                maxLength={18}
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={cnpj}
                onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
              />
              <input
                type="email"
                required
                placeholder="E-mail"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="Crie uma senha"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              {erro && <p className="text-red-600 text-xs">{erro}</p>}
              {sucesso && <p className="text-green-700 text-xs bg-green-50 rounded-md px-3 py-2">{sucesso}</p>}
              <button
                disabled={carregando}
                className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium disabled:opacity-60"
              >
                {carregando ? 'Criando...' : 'Criar minha conta'}
              </button>
            </form>
          )}

          {modo === 'recuperar' && (
            <form onSubmit={recuperarSenha} className="space-y-3">
              <h2 className="text-lg font-semibold">Recuperar senha</h2>
              <p className="text-xs text-gray-500">
                Digite o e-mail da sua conta. Vamos te enviar um link pra criar uma nova senha.
              </p>
              <input
                type="email"
                required
                placeholder="voce@suaempresa.com"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {erro && <p className="text-red-600 text-xs">{erro}</p>}
              {sucesso && <p className="text-green-700 text-xs bg-green-50 rounded-md px-3 py-2">{sucesso}</p>}
              <button
                disabled={carregando || aguardar > 0}
                className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium disabled:opacity-60"
              >
                {carregando ? 'Enviando...' : aguardar > 0 ? `Aguarde ${aguardar}s para pedir de novo` : 'Enviar link de recuperação'}
              </button>
              <button
                type="button"
                onClick={() => { setModo('entrar'); setErro(null); setSucesso(null) }}
                className="w-full text-xs text-gray-500 font-medium py-1"
              >
                ← Voltar pro login
              </button>
            </form>
          )}

          <div className="mt-8 pt-5 border-t text-center space-y-1">
            <p className="text-xs text-gray-500">
              Precisa de ajuda?{' '}
              <a href="mailto:suporte@contrateja.app.br" className="font-medium text-indigo-600 hover:underline">
                suporte@contrateja.app.br
              </a>
            </p>
            <p className="text-[11px] text-gray-400">Desenvolvido por Fábio de Moura</p>
          </div>
        </div>
      </div>
    </div>
  )
}
