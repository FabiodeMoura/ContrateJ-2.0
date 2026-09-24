import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import FiltroPeriodo from '@/components/FiltroPeriodo'
import { ParametrosPeriodo, resolverPeriodo } from '@/lib/periodo'

// Painel Master: visão de toda a plataforma (todos os clientes), só para o dono do ContrateJá.
// Quem pode entrar é definido no banco (tabela super_admins); a função painel_master recusa qualquer outro.

export const dynamic = 'force-dynamic'

interface Movimento {
  data: string
  email: string | null
  evento: string
  tipo: string | null
  quantidade: number
  valor: number
  acesso_ate: string | null
}

interface Painel {
  clientes: {
    total: number
    pagantes_ativos: number
    plano_79: number
    plano_99: number
    gratuitos: number
    cancelamento_agendado: number
    novos_no_periodo: number
  }
  vendas: {
    plano_79: number
    plano_99: number
    renovacoes: number
    pacotes_avulsos: number
    links_avulsos_vendidos: number
    cancelamentos: number
    reembolsos: number
    receita_bruta: number
    reembolsado: number
  }
  links_total: number
  links_por_empresa: { empresa: string; cliente: string | null; links: number }[]
  movimentos: Movimento[]
  lista_clientes: {
    email: string | null
    plano: string
    situacao: string
    acesso_ate: string | null
    empresas: number
    links_periodo: number
    links_usados: number
    limite: number
    desde: string
  }[]
  serie: { dia: string; links: number; vendas: number }[]
}

const NOME_TIPO: Record<string, string> = {
  plano_79: 'Plano 79',
  plano_99: 'Plano 99',
  links_avulsos: 'Links avulsos',
}

const NOME_EVENTO: Record<string, { texto: string; cor: string }> = {
  compra: { texto: 'Venda', cor: 'bg-lime-100 text-lime-800' },
  renovacao: { texto: 'Renovação', cor: 'bg-teal-100 text-teal-800' },
  cancelamento: { texto: 'Cancelou', cor: 'bg-amber-100 text-amber-800' },
  reembolso: { texto: 'Reembolso', cor: 'bg-red-100 text-red-700' },
  fim_de_acesso: { texto: 'Acesso encerrado', cor: 'bg-gray-200 text-gray-700' },
}

function reais(v: number) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function data(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function diaCurto(ymd: string) {
  const [, m, d] = ymd.split('-')
  return `${d}/${m}`
}

function Cartao({ titulo, valor, detalhe, destaque }: { titulo: string; valor: string | number; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${destaque ? 'bg-gradient-to-br from-slate-700 to-teal-600 text-white border-transparent' : 'bg-white'}`}>
      <p className={`text-xs ${destaque ? 'text-white/80' : 'text-gray-500'}`}>{titulo}</p>
      <p className="text-2xl font-semibold mt-1">{valor}</p>
      {detalhe && <p className={`text-[11px] mt-1 ${destaque ? 'text-white/70' : 'text-gray-400'}`}>{detalhe}</p>}
    </div>
  )
}

export default async function MasterPage({ searchParams }: { searchParams: ParametrosPeriodo }) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ehSuper } = await supabase.rpc('eh_super_admin')
  if (!ehSuper) redirect('/dashboard')

  const periodo = resolverPeriodo(searchParams)
  const { data: bruto, error } = await supabase.rpc('painel_master', {
    p_inicio: periodo.inicio,
    p_fim: periodo.fim,
  })

  const p = bruto as Painel | null

  const cancelamentos = (p?.movimentos ?? []).filter((m) => ['cancelamento', 'reembolso', 'fim_de_acesso'].includes(m.evento))
  const vendas = (p?.movimentos ?? []).filter((m) => ['compra', 'renovacao'].includes(m.evento))
  const maiorEmpresa = Math.max(1, ...(p?.links_por_empresa ?? []).map((e) => e.links))
  const serie = (p?.serie ?? []).slice(-31)
  const maiorDia = Math.max(1, ...serie.map((s) => s.links))

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/master" />
      <MobileNav />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg font-semibold">👑 Painel Master</h1>
            <p className="text-xs text-gray-500">
              Visão de toda a plataforma ContrateJá · <span className="font-medium text-teal-700">{periodo.rotulo}</span>
            </p>
          </div>
          <FiltroPeriodo />
        </div>

        {error || !p ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
            Não foi possível carregar o painel agora. Atualize a página em instantes.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Clientes */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Clientes</h2>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <Cartao titulo="Clientes ativos (pagantes)" valor={p.clientes.pagantes_ativos} detalhe="situação de hoje" destaque />
                <Cartao titulo="No Plano 79" valor={p.clientes.plano_79} />
                <Cartao titulo="No Plano 99" valor={p.clientes.plano_99} />
                <Cartao titulo="Contas gratuitas" valor={p.clientes.gratuitos} />
                <Cartao titulo="Cancelaram (ainda com acesso)" valor={p.clientes.cancelamento_agendado} />
                <Cartao titulo="Novos cadastros" valor={p.clientes.novos_no_periodo} detalhe={`de ${p.clientes.total} contas no total`} />
              </div>
            </section>

            {/* Vendas */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Pacotes vendidos no período</h2>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <Cartao titulo="Receita estimada" valor={reais(p.vendas.receita_bruta - p.vendas.reembolsado)} detalhe="preço de tabela, já sem reembolsos" destaque />
                <Cartao titulo="Plano 79 vendidos" valor={p.vendas.plano_79} detalhe="assinaturas novas" />
                <Cartao titulo="Plano 99 vendidos" valor={p.vendas.plano_99} detalhe="assinaturas novas" />
                <Cartao titulo="Renovações mensais" valor={p.vendas.renovacoes} />
                <Cartao titulo="Pacotes de links avulsos" valor={p.vendas.pacotes_avulsos} detalhe={`${p.vendas.links_avulsos_vendidos} links vendidos`} />
                <Cartao titulo="Cancelamentos / reembolsos" valor={`${p.vendas.cancelamentos} / ${p.vendas.reembolsos}`} detalhe={p.vendas.reembolsado ? `${reais(p.vendas.reembolsado)} reembolsados` : undefined} />
              </div>
            </section>

            {/* Links gerados */}
            <section className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Links gerados por empresa</h2>
                  <span className="text-xs text-gray-500">{p.links_total} no total</span>
                </div>
                {p.links_por_empresa.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum link gerado neste período.</p>
                ) : (
                  <div className="space-y-2">
                    {p.links_por_empresa.map((e, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs gap-2">
                          <span className="font-medium truncate">{e.empresa}</span>
                          <span className="font-semibold text-teal-700 shrink-0">{e.links}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{e.cliente ?? '—'}</div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-gradient-to-r from-teal-600 to-lime-400 rounded-full" style={{ width: `${(e.links / maiorEmpresa) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border rounded-xl p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Links gerados por dia</h2>
                {serie.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem movimento neste período.</p>
                ) : (
                  <>
                    <div className="flex items-end gap-1 h-40 overflow-x-auto">
                      {serie.map((s) => (
                        <div key={s.dia} className="flex flex-col items-center justify-end min-w-[22px] flex-1 h-full" title={`${diaCurto(s.dia)}: ${s.links} link(s), ${s.vendas} venda(s)`}>
                          <span className="text-[10px] text-gray-500">{s.links || ''}</span>
                          <div className="w-full bg-teal-600 rounded-t" style={{ height: `${(s.links / maiorDia) * 100}%`, minHeight: s.links ? 4 : 0 }} />
                          {s.vendas > 0 && <div className="w-full h-1.5 bg-lime-400 mt-0.5 rounded" />}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 overflow-x-auto mt-1">
                      {serie.map((s) => (
                        <span key={s.dia} className="min-w-[22px] flex-1 text-center text-[9px] text-gray-400">{diaCurto(s.dia)}</span>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">
                      Barras = links gerados · faixa verde = dia com venda{(p.serie ?? []).length > 31 ? ' · mostrando os últimos 31 dias com movimento' : ''}
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* Cancelamentos */}
            <section className="bg-white border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Cancelamentos e reembolsos</h2>
              {cancelamentos.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum cancelamento neste período. 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-3">Data</th>
                        <th className="py-2 pr-3">Cliente</th>
                        <th className="py-2 pr-3">O que houve</th>
                        <th className="py-2 pr-3">Produto</th>
                        <th className="py-2 pr-3">Acesso até</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cancelamentos.map((m, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-3 whitespace-nowrap">{dataHora(m.data)}</td>
                          <td className="py-2 pr-3">{m.email ?? '—'}</td>
                          <td className="py-2 pr-3">
                            <span className={`px-2 py-0.5 rounded-full ${NOME_EVENTO[m.evento]?.cor ?? ''}`}>{NOME_EVENTO[m.evento]?.texto ?? m.evento}</span>
                          </td>
                          <td className="py-2 pr-3">{NOME_TIPO[m.tipo ?? ''] ?? m.tipo ?? '—'}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{data(m.acesso_ate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Vendas detalhadas */}
            <section className="bg-white border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Vendas e renovações</h2>
              {vendas.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma venda neste período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-3">Data</th>
                        <th className="py-2 pr-3">Cliente</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Produto</th>
                        <th className="py-2 pr-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendas.map((m, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-3 whitespace-nowrap">{dataHora(m.data)}</td>
                          <td className="py-2 pr-3">{m.email ?? '—'}</td>
                          <td className="py-2 pr-3">
                            <span className={`px-2 py-0.5 rounded-full ${NOME_EVENTO[m.evento]?.cor ?? ''}`}>{NOME_EVENTO[m.evento]?.texto ?? m.evento}</span>
                          </td>
                          <td className="py-2 pr-3">
                            {NOME_TIPO[m.tipo ?? ''] ?? m.tipo}
                            {m.tipo === 'links_avulsos' && m.quantidade ? ` (${m.quantidade})` : ''}
                          </td>
                          <td className="py-2 pr-3 text-right whitespace-nowrap">{reais(m.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Clientes */}
            <section className="bg-white border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Todos os clientes</h2>
              <p className="text-[11px] text-gray-400 mb-3">A conta de demonstração não entra nos números.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Plano</th>
                      <th className="py-2 pr-3">Situação</th>
                      <th className="py-2 pr-3 text-center">Empresas</th>
                      <th className="py-2 pr-3 text-center">Links no período</th>
                      <th className="py-2 pr-3 text-center">Saldo do mês</th>
                      <th className="py-2 pr-3">Cliente desde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.lista_clientes.map((c, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3">{c.email ?? '—'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{c.plano}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded-full whitespace-nowrap ${
                              c.situacao === 'Ativo' ? 'bg-lime-100 text-lime-800' : c.situacao === 'Gratuito' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.situacao === 'Ativo' ? 'Ativo' : c.situacao === 'Gratuito' ? 'Gratuito' : `Cancelado · até ${data(c.acesso_ate)}`}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-center">{c.empresas}</td>
                        <td className="py-2 pr-3 text-center font-semibold text-teal-700">{c.links_periodo}</td>
                        <td className="py-2 pr-3 text-center whitespace-nowrap">{c.links_usados} / {c.limite}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{data(c.desde)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
