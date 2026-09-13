import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

const SEGMENTOS_INFO: Record<string, { emoji: string; cor: string }> = {
  Restaurante: { emoji: '🍽️', cor: 'from-orange-400 to-orange-600' },
  Bar: { emoji: '🍸', cor: 'from-pink-400 to-pink-600' },
  Lanchonete: { emoji: '🍔', cor: 'from-yellow-400 to-yellow-600' },
  Padaria: { emoji: '🍞', cor: 'from-sky-400 to-sky-600' },
  'Sacolão': { emoji: '🥬', cor: 'from-green-400 to-green-600' },
  Pizzaria: { emoji: '🍕', cor: 'from-red-400 to-red-600' },
}

export default async function DashboardPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome_fantasia, segmento_principal')
    .eq('dono_id', user.id)

  const empresaAtual = empresas?.[0]

  const { count: vagasAtivas } = await supabase
    .from('vagas')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaAtual?.id)
    .eq('status', 'Ativa')

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
            💼
          </div>
          <span className="font-semibold text-sm">ContrateJá</span>
        </div>

        <div className="flex items-center gap-2">
          {empresas && empresas.length > 0 && (
            <select className="border rounded-lg px-3 py-2 text-sm bg-white">
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
              ))}
            </select>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* Banner de boas-vindas com imagem */}
      <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800 text-white">
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=60"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="relative p-6 md:p-8">
          <h1 className="text-xl md:text-2xl font-semibold mb-1">
            Olá, {empresaAtual?.nome_fantasia ?? 'sua empresa'}! 👋
          </h1>
          <p className="text-sm text-indigo-100 max-w-md">
            Acompanhe suas vagas e candidatos, e encontre a pessoa certa pro seu time.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-xl p-4">
          <p className="text-xs opacity-90">Vagas Ativas</p>
          <p className="text-2xl font-bold">{vagasAtivas ?? 0}</p>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-600 text-white rounded-xl p-4">
          <p className="text-xs opacity-90">Candidatos Recebidos</p>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-xl p-4">
          <p className="text-xs opacity-90">Contratações</p>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-xl p-4">
          <p className="text-xs opacity-90">Aderência Média</p>
          <p className="text-2xl font-bold">—</p>
        </div>
      </section>

      <p className="text-sm font-medium mb-3">Segmentos</p>
      <section className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(SEGMENTOS_INFO).map(([nome, info]) => (
          <Link
            key={nome}
            href={`/segmento/${nome.toLowerCase()}`}
            className={`bg-gradient-to-br ${info.cor} text-white rounded-xl p-4 text-center hover:opacity-90 hover:scale-[1.03] transition shadow-sm`}
          >
            <div className="text-2xl mb-1">{info.emoji}</div>
            <p className="text-xs font-semibold">{nome}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
