import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import StatusBadge from '@/components/StatusBadge'
import AvatarIniciais from '@/components/AvatarIniciais'
import LogoutButton from './LogoutButton'
import EmpresaSelector from '@/components/EmpresaSelector'
import LogoMarca from '@/components/LogoMarca'
import { SEGMENTOS_INFO } from '@/lib/segmentos'

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { empresa?: string }
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nomeUsuario = (user.user_metadata as any)?.nome ?? user.email?.split('@')[0] ?? 'Gestor'

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome_fantasia, segmento_principal')
    .eq('dono_id', user.id)

  const temVariasEmpresas = (empresas?.length ?? 0) > 1
  const filtroEmpresa = searchParams.empresa ?? (temVariasEmpresas ? 'todas' : empresas?.[0]?.id) ?? 'todas'
  const empresaIds = filtroEmpresa === 'todas'
    ? (empresas?.map((e) => e.id) ?? [])
    : [filtroEmpresa]
  const empresaAtual = filtroEmpresa === 'todas' ? undefined : empresas?.find((e) => e.id === filtroEmpresa)

  const { data: vagasComCandidatos } = await supabase
    .from('vagas')
    .select('id, funcao, status, criado_em, candidatos ( id, status, percentual_aderencia )')
    .in('empresa_id', empresaIds.length ? empresaIds : ['00000000-0000-0000-0000-000000000000'])
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
    .in('vagas.empresa_id', empresaIds.length ? empresaIds : ['00000000-0000-0000-0000-000000000000'])
    .order('criado_em', { ascending: false })
    .limit(5)

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano, limite_links, links_usados, links_extras')
    .eq('dono_id', user.id)
    .single()

  const limiteTotalLinks = (assinatura?.limite_links ?? 20) + (assinatura?.links_extras ?? 0)
  const linksUsados = assinatura?.links_usados ?? 0
  const contaIlimitada = assinatura?.plano === 'Demonstração'
  const percentualUso = limiteTotalLinks > 0 && !contaIlimitada ? Math.min(100, Math.round((linksUsados / limiteTotalLinks) * 100)) : 0

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('status, tipo_desligamento')
    .in('empresa_id', empresaIds.length ? empresaIds : ['00000000-0000-0000-0000-000000000000'])

  const totalColaboradores = colaboradores?.length ?? 0
  const colaboradoresAtivos = colaboradores?.filter((c) => c.status === 'Ativo').length ?? 0
  const colaboradoresDesligados = colaboradores?.filter((c) => c.status === 'Desligado').length ?? 0
  const pediuDemissao = colaboradores?.filter((c) => c.tipo_desligamento === 'Pediu demissão').length ?? 0
  const foiDemitido = colaboradores?.filter((c) => c.tipo_desligamento === 'Foi demitido').length ?? 0
  const turnover = totalColaboradores > 0
    ? Math.round((colaboradoresDesligados / totalColaboradores) * 1000) / 10
    : 0

  const CARDS = [
    { label: 'Vagas Ativas', valor: vagasAtivas, icone: '💼', fundo: 'from-teal-500 to-teal-600', suave: 'bg-teal-50/60 border-teal-100', link: '/vagas', linkLabel: 'Ver todas' },
    { label: 'Candidatos Recebidos', valor: totalCandidatos, icone: '👥', fundo: 'from-cyan-500 to-cyan-600', suave: 'bg-cyan-50/60 border-cyan-100', link: '/candidatos', linkLabel: 'Ver candidatos' },
    { label: 'Contratações', valor: aprovados, icone: '✅', fundo: 'from-lime-500 to-lime-600', suave: 'bg-lime-50/60 border-lime-100', link: '/candidatos', linkLabel: 'Ver histórico' },
    { label: 'Taxa de Admissão', valor: `${taxaAdmissao}%`, icone: '📈', fundo: 'from-emerald-500 to-emerald-600', suave: 'bg-emerald-50/60 border-emerald-100', link: '/relatorios', linkLabel: 'Ver relatório' },
    { label: 'Colaboradores Ativos', valor: colaboradoresAtivos, icone: '🪪', fundo: 'from-sky-500 to-sky-600', suave: 'bg-sky-50/60 border-sky-100', link: '/colaboradores', linkLabel: 'Ver colaboradores' },
    { label: 'Desligamentos', valor: colaboradoresDesligados, icone: '🚪', fundo: 'from-red-500 to-red-600', suave: 'bg-red-50/60 border-red-100', link: '/colaboradores', linkLabel: 'Ver colaboradores' },
    { label: 'Turnover', valor: `${turnover}%`, icone: '📉', fundo: 'from-amber-500 to-orange-600', suave: 'bg-amber-50/60 border-amber-100', link: '/colaboradores', linkLabel: 'Ver colaboradores' },
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
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/dashboard" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-700 via-teal-600 to-lime-400">
          <div className="absolute -top-10 right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-14 right-1/3 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-6 right-6 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl rotate-6 hidden sm:flex">
            🎯
          </div>
          <div className="absolute bottom-6 right-24 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl -rotate-6 hidden md:flex">
            ✅
          </div>

          <div className="relative p-5 md:p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img src="/logo-icon.png" alt="" className="w-10 h-10 rounded-xl object-contain shrink-0" />
                <span className="hidden sm:block drop-shadow-sm"><LogoMarca altura={32} /></span>
              </div>
              <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">🔔</div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-2.5 py-1.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white text-indigo-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                  {nomeUsuario.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-xs leading-tight text-white min-w-0 hidden sm:block">
                  <p className="font-medium truncate">{nomeUsuario}</p>
                  <p className="text-teal-100">Administrador</p>
                </div>
                <LogoutButton />
              </div>
              </div>
            </div>

            <div>
              <h1 className="text-xl md:text-2xl font-semibold mb-2 text-white leading-snug">
                Olá, {empresaAtual?.nome_fantasia ?? nomeUsuario}! 👋
              </h1>
              <p className="text-sm text-teal-50 max-w-sm">
                Aqui você acompanha suas vagas, candidatos e o progresso das suas contratações, tudo em um só lugar.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium">
              Plano <span className="text-teal-600">{assinatura?.plano ?? 'Gratuito'}</span> — {contaIlimitada ? `${linksUsados} links usados (ilimitado)` : `${linksUsados} de ${limiteTotalLinks} links usados`}
            </p>
            <Link href="/planos" className="text-xs font-medium text-indigo-600 hover:underline">
              {percentualUso >= 80 ? 'Fazer upgrade →' : 'Ver planos →'}
            </Link>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${percentualUso >= 100 ? 'bg-red-500' : percentualUso >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${percentualUso}%` }}
            />
          </div>
        </div>

        {/* Segmentos */}
        <p className="text-sm font-medium mb-3">Criar vaga por segmento</p>
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

        {/* Cards */}
        {empresas && empresas.length > 1 && (
          <div className="flex items-center justify-between mb-3 mt-8">
            <p className="text-sm font-medium">Indicadores</p>
            <EmpresaSelector empresas={empresas} valorAtual={filtroEmpresa} incluirTodas />
          </div>
        )}
        <section className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
          {CARDS.map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl border p-4 ${card.suave} hover:shadow-md transition`}>
              <div className={`absolute -right-3 -top-3 w-14 h-14 rounded-full bg-gradient-to-br ${card.fundo} opacity-10`} />
              <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${card.fundo} flex items-center justify-center text-lg mb-3 shadow-sm`}>
                {card.icone}
              </div>
              <p className="relative text-2xl font-bold text-gray-800 leading-none">{card.valor}</p>
              <p className="relative text-xs text-gray-500 mt-1.5 mb-2">{card.label}</p>
              <Link href={card.link} className="relative text-xs font-medium text-indigo-600 hover:underline">
                {card.linkLabel} →
              </Link>
            </div>
          ))}
        </section>

        {colaboradoresDesligados > 0 && (
          <div className="bg-white rounded-2xl border p-5 mb-6">
            <p className="text-sm font-medium mb-3">Motivo dos desligamentos</p>
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-3">
              {pediuDemissao > 0 && (
                <div
                  className="h-full bg-orange-400"
                  style={{ width: `${(pediuDemissao / colaboradoresDesligados) * 100}%` }}
                />
              )}
              {foiDemitido > 0 && (
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(foiDemitido / colaboradoresDesligados) * 100}%` }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Pediu demissão — <strong>{pediuDemissao}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Foi demitido — <strong>{foiDemitido}</strong>
              </span>
              {(colaboradoresDesligados - pediuDemissao - foiDemitido) > 0 && (
                <span className="text-gray-400">
                  {colaboradoresDesligados - pediuDemissao - foiDemitido} sem motivo registrado
                </span>
              )}
            </div>
          </div>
        )}

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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-teal-600 to-lime-400 text-white p-5">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute bottom-3 right-3 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg">
                🚀
              </div>
              <p className="relative font-semibold text-sm leading-snug max-w-[80%]">
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

      </main>
      <MobileNav />
    </div>
  )
}
