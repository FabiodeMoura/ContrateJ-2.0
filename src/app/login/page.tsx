'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const SEGMENTOS = ['Restaurante', 'Bar', 'Lanchonete', 'Padaria', 'Sacolão', 'Pizzaria']

export default function LoginPage() {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Campos de login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  // Campos extras de cadastro
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [segmento, setSegmento] = useState(SEGMENTOS[0])
  const [nomeResponsavel, setNomeResponsavel] = useState('')

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
    setCarregando(true)
    setErro(null)

    // 1. Cria o usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome: nomeResponsavel } },
    })

    if (error || !data.user) {
      setCarregando(false)
      setErro(error?.message ?? 'Não foi possível criar a conta.')
      return
    }

    // 2. Cria a primeira empresa vinculada a esse usuário
    const { error: erroEmpresa } = await supabase.from('empresas').insert({
      dono_id: data.user.id,
      nome_fantasia: nomeEmpresa,
      segmento_principal: segmento,
    })

    setCarregando(false)

    if (erroEmpresa) {
      setErro('Conta criada, mas houve um erro ao cadastrar a empresa: ' + erroEmpresa.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — branding */}
      <div className="hidden md:flex md:flex-1 bg-gradient-to-br from-indigo-950 via-indigo-700 to-purple-700 text-white p-10 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">💼</div>
          <span className="font-semibold text-lg">ContrateJá</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold mb-3 leading-snug">
            Contrate certo desde a primeira entrevista.
          </h1>
          <p className="text-sm text-indigo-100 max-w-sm">
            Avalie o perfil comportamental dos candidatos antes de chamar pra
            entrevista, com testes prontos pro seu segmento.
          </p>
        </div>
        <p className="text-xs text-indigo-200">
          © ContrateJá — Talentos que fazem a diferença no seu negócio
        </p>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                modo === 'entrar' ? 'bg-white shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => setModo('entrar')}
            >
              Entrar
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                modo === 'cadastrar' ? 'bg-white shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => setModo('cadastrar')}
            >
              Criar conta
            </button>
          </div>

          {modo === 'entrar' ? (
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
              {erro && <p className="text-red-600 text-xs">{erro}</p>}
              <button
                disabled={carregando}
                className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium disabled:opacity-60"
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
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
              <button
                disabled={carregando}
                className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium disabled:opacity-60"
              >
                {carregando ? 'Criando...' : 'Criar minha conta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
