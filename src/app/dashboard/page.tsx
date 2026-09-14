import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import StatusBadge from '@/components/StatusBadge'
import AvatarIniciais from '@/components/AvatarIniciais'
import LogoutButton from './LogoutButton'

const SEGMENTOS_INFO: Record<string, { emoji: string; cor: string }> = {
  Restaurante: { emoji: '🍽️', cor: 'from-orange-400 to-orange-600' },
  Bar: { emoji: '🍸', cor: 'from-pink-400 to-pink-600' },
  Lanchonete: { emoji: '🍔', cor: 'from-yellow-400 to-yellow-600' },
  Padaria: { emoji: '🍞', cor: 'from-sky-400 to-sky-600' },
  'Sacolão': { emoji: '🥬', cor: 'from-green-400 to-green-600' },
  Pizzaria: { emoji: '🍕', cor: 'from-red-400 to-red-600' },
}

function tempoRelativo(data: string) {
  const diffMs = Date.now() - new Date(data).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 60) return `há ${min || 1} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  return `há ${d} dias`
}

export default async function DashboardPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nomeUsuario = (user.user_metadata as any)?.nome ?? user.email?.split('@')[0] ?? 'Gestor'

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome_fantasia, segmento_principal')
    .eq('dono_id', user.id)

  const empresaAtual = empresas?.[0]

  const { data: vagasComCandidatos } = await supabase
    .from('vagas')
    .select('id, funcao, status, criado_em, candidatos ( id, status, percentual_aderencia )')
    .eq('empresa_id', empresaAtual?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('criado_em', { ascending: false })

  const vagasAtivas = vagasComCandidatos?.filter((v) => v.status === 'Ativa').length ?? 0
  const todosCandidatos = vagasComCandidatos?.flatMap((v) => v.candidatos ?? []) ?? []
  const totalCandidatos = todosCandidatos.length
  const aprovados = todosCandidatos.filter((c) => c.status === 'Aprovado').length
  const taxaAdmissao = totalCandidatos ? Math.round((aprovados / totalCandidatos) * 100) : 0

  const vagasDestaque = [...(vagasComCandidatos ?? [])]
    .sort((a, b) => (b.candidatos?.length ?? 0) - (a.candidatos?.length ?? 0))
    .slice(0, 5)

  const { data: candidatosRecentes } = await supabase
    .from('candidatos')
    .select('id, nome_completo, email, status, criado_em, vagas!inner ( funcao, empresa_id )')
    .eq('vagas.empresa_id', empresaAtual?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('criado_em', { ascending: false })
    .limit(5)

  const CARDS = [
    { label: 'Vagas Ativas', valor: vagasAtivas, icone: '💼', fundo: 'from-indigo-500 to-indigo-600', link: '/vagas', linkLabel: 'Ver todas' },
    { label: 'Candidatos Recebidos', valor: totalCandidatos, icone: '👥', fundo: 'from-green-500 to-green-600', link: '/candidatos', linkLabel: 'Ver candidatos' },
    { label: 'Contratações', valor: aprovados, icone: '✅', fundo: 'from-blue-500 to-blue-600', link: '/candidatos', linkLabel: 'Ver histórico' },
    { label: 'Taxa de Admissão', valor: `${taxaAdmissao}%`, icone: '📈', fundo: 'from-purple-500 to-purple-600', link: '/relatorios', linkLabel: 'Ver relatório' },
  ]

  const atividades = [
    ...(candidatosRecentes ?? []).map((c) => ({
      texto: c.status === 'Aprovado' ? 'Candidato aprovado' : 'Novo candidato se inscreveu',
      detalhe: `${c.nome_completo} — ${(c.vagas as any)?.funcao ?? ''}`,
      data: c.criado_em,
      cor: c.status === 'Aprovado' ? 'bg-green-500' : 'bg-amber-500',
    })),
    ...(vagasComCandidatos ?? []).slice(0, 2).map((v) => ({
      texto: 'Vaga criada',
      detalhe: v.funcao,
      data: v.criado_em,
      cor: 'bg-indigo-500',
    })),
  ]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar ativo="/dashboard" />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800 text-white">
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=60"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
          <div className="relative p-6 md:p-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold mb-1">
                Olá, {empresaAtual?.nome_fantasia ?? 'sua empresa'}! 👋
              </h1>
              <p className="text-sm text-indigo-100 max-w-md">
                Aqui você acompanha suas vagas, candidatos e o progresso das suas contratações, tudo em um só lugar.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🔔</div>
              <div className="w-8 h-8 rounded-full bg-white text-indigo-700 flex items-center justify-center text-xs font-bold">
                {nomeUsuario.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs leading-tight">
                <p className="font-medium">{nomeUsuario}</p>
                <p className="text-indigo-200">Administrador</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {CARDS.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.fundo} flex items-center justify-center text-base mb-3`}>
                {card.icone}
              </div>
              <p className="text-2xl font-bold text-gray-800 leading-none">{card.valor}</p>
              <p className="text-xs text-gray-500 mt-1.5 mb-2">{card.label}</p>
              <Link href={card.link} className="text-xs font-medium text-indigo-600 hover:underline">
                {card.linkLabel} →
              </Link>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Vagas em destaque */}
            <div className="bg-white rounded-2xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium text-sm flex items-center gap-2">💼 Vagas em Destaque</p>
                <Link href="/vagas" className="text-xs text-indigo-600 font-medium hover:underline">Ver todas →</Link>
              </div>
              {vagasDestaque.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhuma vaga criada ainda.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b">
                      <th className="pb-2 font-medium">Função</th>
                      <th className="pb-2 font-medium">Candidatos</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vagasDestaque.map((v) => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{v.funcao}</td>
                        <td className="py-2.5">{v.candidatos?.length ?? 0}</td>
                        <td className="py-2.5"><StatusBadge status={v.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Candidatos recentes */}
            <div className="bg-white rounded-2xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium text-sm flex items-center gap-2">👥 Candidatos Recentes</p>
                <Link href="/candidatos" className="text-xs text-indigo-600 font-medium hover:underline">Ver todos →</Link>
              </div>
              {!candidatosRecentes || candidatosRecentes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum candidato ainda.</p>
              ) : (
                <div className="space-y-3">
                  {candidatosRecentes.map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <AvatarIniciais nome={c.nome_completo} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.nome_completo}</p>
                        <p className="text-xs text-gray-400 truncate">{(c.vagas as any)?.funcao}</p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">{tempoRelativo(c.criado_em)}</p>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita */}
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 to-purple-900 text-white p-5">
              <img
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=500&q=60"
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <p className="relative font-semibold text-sm leading-snug">
                Contrate as pessoas certas e monte o time que seu negócio merece.
              </p>
            </div>

            <div className="bg-white rounded-2xl border p-5">
              <p className="font-medium text-sm mb-4 flex items-center gap-2">🕐 Últimas Atividades</p>
              {atividades.length === 0 ? (
                <p className="text-xs text-gray-400">Sem atividades recentes.</p>
              ) : (
                <div className="space-y-3">
                  {atividades.map((a, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.cor}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{a.texto}</p>
                        <p className="text-[11px] text-gray-400 truncate">{a.detalhe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border p-5">
              <p className="font-medium text-sm mb-3 flex items-center gap-2">⚡ Ações Rápidas</p>
              <div className="space-y-1">
                <Link href="/vagas" className="flex items-center justify-between text-sm px-2 py-2 rounded-lg hover:bg-gray-50">
                  <span>💼 Criar nova vaga</span> <span className="text-gray-300">›</span>
                </Link>
                <Link href="/candidatos" className="flex items-center justify-between text-sm px-2 py-2 rounded-lg hover:bg-gray-50">
                  <span>👥 Ver todos os candidatos</span> <span className="text-gray-300">›</span>
                </Link>
                <Link href="/relatorios" className="flex items-center justify-between text-sm px-2 py-2 rounded-lg hover:bg-gray-50">
                  <span>📈 Gerar relatório</span> <span className="text-gray-300">›</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Segmentos */}
        <p className="text-sm font-medium mt-8 mb-3">Criar vaga por segmento</p>
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
      </main>
      <MobileNav />
    </div>
  )
}
