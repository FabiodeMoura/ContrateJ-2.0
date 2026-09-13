import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './LogoutButton'
import NovaEmpresaButton from './NovaEmpresaButton'

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

  const { data: vagasDaEmpresa } = await supabase
    .from('vagas')
    .select('id, status')
    .eq('empresa_id', empresaAtual?.id)

  const vagaIds = vagasDaEmpresa?.map((v) => v.id) ?? []
  const vagasAtivas = vagasDaEmpresa?.filter((v) => v.status === 'Ativa').length ?? 0

  const { data: candidatosDaEmpresa } = await supabase
    .from('candidatos')
    .select('status, percentual_aderencia')
    .in('vaga_id', vagaIds.length ? vagaIds : ['00000000-0000-0000-0000-000000000000'])

  const totalCandidatos = candidatosDaEmpresa?.length ?? 0
  const contar = (status: string) => candidatosDaEmpresa?.filter((c) => c.status === status).length ?? 0

  const aderencias = candidatosDaEmpresa
    ?.map((c) => c.percentual_aderencia)
    .filter((v): v is number => v != null) ?? []
  const aderenciaMedia = aderencias.length
    ? Math.round(aderencias.reduce((a, b) => a + b, 0) / aderencias.length)
    : null

  const CARDS = [
    { label: 'Vagas ativas', valor: vagasAtivas, icone: '💼', cor: 'text-indigo-600 bg-indigo-50' },
    { label: 'Candidatos avaliados', valor: totalCandidatos, icone: '🧑‍🤝‍🧑', cor: 'text-slate-600 bg-slate-100' },
    { label: 'Em análise', valor: contar('Em análise'), icone: '⏳', cor: 'text-gray-600 bg-gray-100' },
    { label: 'Entrevistados', valor: contar('Entrevistado'), icone: '🗣️', cor: 'text-blue-600 bg-blue-50' },
    { label: 'Aprovados', valor: contar('Aprovado'), icone: '✅', cor: 'text-green-600 bg-green-50' },
    { label: 'Reprovados', valor: contar('Reprovado'), icone: '⛔', cor: 'text-red-600 bg-red-50' },
    { label: 'Aderência média', valor: aderenciaMedia != null ? `${aderenciaMedia}%` : '—', icone: '📊', cor: 'text-purple-600 bg-purple-50' },
  ]

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
          <NovaEmpresaButton />
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

      {/* Cards de indicadores — visual clean, sem gradiente pesado */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {CARDS.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-2 ${card.cor}`}>
              {card.icone}
            </div>
            <p className="text-xl font-semibold text-gray-800">{card.valor}</p>
            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{card.label}</p>
          </div>
        ))}
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
