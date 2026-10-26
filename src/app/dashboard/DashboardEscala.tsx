import Link from 'next/link'
import EmpresaSelector from '@/components/EmpresaSelector'
import FiltroPeriodoEscala from '@/app/escala/FiltroPeriodoEscala'
import {
  DIAS_SEMANA, NOME_OCORRENCIA, PRECO_ESCALA, configDe, diaDaSemana, hojeIso, ocorrenciaDoDia, periodoEscala, situacaoDoDia,
  type ConfigColab, type Ocorrencia, type ParametrosPeriodoEscala, type Situacao,
} from '@/lib/escala'

interface Empresa { id: string; nome_fantasia: string }
interface Colab { id: string; empresa_id: string; nome_completo: string; funcao: string | null }

interface Totais { colaboradores: number; T: number; F: number; FA: number; AT: number; FE: number; alertas: number }

const VAZIO = (): Totais => ({ colaboradores: 0, T: 0, F: 0, FA: 0, AT: 0, FE: 0, alertas: 0 })

function absenteismo(t: Totais) {
  const base = t.T + t.FA + t.AT
  return base ? Math.round(((t.FA + t.AT) / base) * 1000) / 10 : 0
}

function diaBr(d: string) {
  return d.split('-').reverse().join('/')
}

// Dashboard da Escala de Trabalho (dentro do Dashboard do ContrateJá).
export default async function DashboardEscala({
  supabase, empresas, searchParams,
}: {
  supabase: any
  empresas: Empresa[]
  searchParams: { empresa?: string } & ParametrosPeriodoEscala
}) {
  const { data: liberada } = await supabase.rpc('escala_liberada')

  if (!liberada) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-lime-50 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="font-semibold">Dashboard da Escala de trabalho</p>
          <p className="text-sm text-gray-600 mt-1 max-w-xl">
            Veja quem está trabalhando, de folga ou ausente em cada loja, com faltas, atestados, férias, absenteísmo e alertas de folga.
            Disponível no módulo Escala de trabalho, por {PRECO_ESCALA}/mês.
          </p>
        </div>
        <Link href="/escala" className="text-center text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 shrink-0">Conhecer a Escala</Link>
      </div>
    )
  }

  const filtroEmpresa = empresas.some((e) => e.id === searchParams.empresa) ? searchParams.empresa! : 'todas'
  const ids = filtroEmpresa === 'todas' ? empresas.map((e) => e.id) : [filtroEmpresa]
  const idsConsulta = ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
  const periodo = periodoEscala(searchParams)
  const dias = periodo.dias
  const inicio = dias[0]
  const fim = dias[dias.length - 1]
  const hoje = hojeIso()
  const diaReferencia = dias.includes(hoje) ? hoje : fim

  const [c, cfg, aj, oc] = await Promise.all([
    supabase.from('colaboradores').select('id, empresa_id, nome_completo, funcao').in('empresa_id', idsConsulta).eq('status', 'Ativo'),
    supabase.from('cj_escala_colab').select('*').in('empresa_id', idsConsulta),
    supabase.from('cj_escala_ajustes').select('colaborador_id, dia, trabalha').in('empresa_id', idsConsulta).gte('dia', inicio).lte('dia', fim),
    supabase.from('cj_escala_ocorrencias').select('id, colaborador_id, empresa_id, tipo, inicio, fim, observacao').in('empresa_id', idsConsulta).lte('inicio', fim).gte('fim', inicio),
  ])
  const colabs: Colab[] = c.data ?? []
  const configs: ConfigColab[] = cfg.data ?? []
  const ocorrencias: Ocorrencia[] = oc.data ?? []
  const ajustes = new Map<string, boolean>()
  for (const a of (aj.data ?? []) as { colaborador_id: string; dia: string; trabalha: boolean }[]) ajustes.set(`${a.colaborador_id}|${a.dia}`, a.trabalha)

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome_fantasia ?? '—'

  // Situação de cada colaborador em cada dia + totais
  const geral = VAZIO()
  const porLoja = new Map<string, Totais>()
  const porFuncao = new Map<string, Totais>()
  const porDiaLoja = new Map<string, number>() // `${empresa}|${dia}` -> trabalhando
  const ranking: { c: Colab; FA: number; AT: number; FE: number }[] = []
  const alertas: { texto: string; loja: string }[] = []
  const hojeLista: { c: Colab; s: Situacao }[] = []

  for (const col of colabs) {
    const conf = configDe(configs, col.id)
    const loja = porLoja.get(col.empresa_id) ?? VAZIO()
    const funcao = col.funcao || 'Sem função'
    const fn = porFuncao.get(funcao) ?? VAZIO()
    loja.colaboradores++; fn.colaboradores++; geral.colaboradores++
    let seq = 0, maxSeq = 0, domingos = 0, domingosTrab = 0
    const pessoal = { FA: 0, AT: 0, FE: 0 }
    for (const d of dias) {
      const s = situacaoDoDia(conf, ajustes.get(`${col.id}|${d}`), ocorrenciaDoDia(ocorrencias, col.id, d), d)
      loja[s]++; fn[s]++; geral[s]++
      if (s === 'FA' || s === 'AT' || s === 'FE') pessoal[s]++
      if (s === 'T') {
        seq++; maxSeq = Math.max(maxSeq, seq)
        porDiaLoja.set(`${col.empresa_id}|${d}`, (porDiaLoja.get(`${col.empresa_id}|${d}`) ?? 0) + 1)
      } else seq = 0
      if (diaDaSemana(d) === 0) { domingos++; if (s === 'T') domingosTrab++ }
      if (d === diaReferencia) hojeLista.push({ c: col, s })
    }
    if (conf.jornada !== '12x36' && maxSeq > 6) {
      alertas.push({ texto: `${col.nome_completo} trabalha ${maxSeq} dias seguidos sem folga.`, loja: nomeEmpresa(col.empresa_id) })
      loja.alertas++; fn.alertas++; geral.alertas++
    }
    if (conf.jornada !== '12x36' && dias.length >= 28 && domingos > 0 && domingosTrab === domingos) {
      alertas.push({ texto: `${col.nome_completo} trabalha todos os domingos do período.`, loja: nomeEmpresa(col.empresa_id) })
      loja.alertas++; fn.alertas++; geral.alertas++
    }
    if (pessoal.FA + pessoal.AT + pessoal.FE > 0) ranking.push({ c: col, ...pessoal })
    porLoja.set(col.empresa_id, loja)
    porFuncao.set(funcao, fn)
  }

  const trabalhandoRef = hojeLista.filter((h) => h.s === 'T').length
  const folgaRef = hojeLista.filter((h) => h.s === 'F').length
  const ausentesRef = hojeLista.filter((h) => h.s === 'FA' || h.s === 'AT' || h.s === 'FE')
  const mediaDia = dias.length ? Math.round((geral.T / dias.length) * 10) / 10 : 0
  ranking.sort((a, b) => (b.FA + b.AT) - (a.FA + a.AT) || b.FE - a.FE)

  // Dia com menos gente em cada loja
  const menorDia = (empresaId: string) => {
    let melhor: { dia: string; n: number } | null = null
    for (const d of dias) {
      const n = porDiaLoja.get(`${empresaId}|${d}`) ?? 0
      if (!melhor || n < melhor.n) melhor = { dia: d, n }
    }
    return melhor
  }

  const rotuloRef = diaReferencia === hoje ? 'hoje' : `em ${diaBr(diaReferencia)}`
  const CARDS = [
    { label: `Trabalhando ${rotuloRef}`, valor: trabalhandoRef, icone: '🟢', fundo: 'from-emerald-500 to-emerald-600', suave: 'bg-emerald-50/60 border-emerald-100' },
    { label: `De folga ${rotuloRef}`, valor: folgaRef, icone: '🌙', fundo: 'from-slate-500 to-slate-600', suave: 'bg-slate-50/60 border-slate-100' },
    { label: `Ausentes ${rotuloRef}`, valor: ausentesRef.length, icone: '🚨', fundo: 'from-red-500 to-red-600', suave: 'bg-red-50/60 border-red-100' },
    { label: 'Média trabalhando por dia', valor: mediaDia, icone: '📊', fundo: 'from-teal-500 to-teal-600', suave: 'bg-teal-50/60 border-teal-100' },
    { label: 'Dias de falta', valor: geral.FA, icone: '❌', fundo: 'from-rose-500 to-rose-600', suave: 'bg-rose-50/60 border-rose-100' },
    { label: 'Dias de atestado', valor: geral.AT, icone: '🩺', fundo: 'from-amber-500 to-orange-600', suave: 'bg-amber-50/60 border-amber-100' },
    { label: 'Dias de férias', valor: geral.FE, icone: '🏖️', fundo: 'from-sky-500 to-sky-600', suave: 'bg-sky-50/60 border-sky-100' },
    { label: 'Absenteísmo', valor: `${absenteismo(geral)}%`, icone: '📉', fundo: 'from-purple-500 to-purple-600', suave: 'bg-purple-50/60 border-purple-100' },
  ]

  const linhasLoja = Array.from(porLoja.entries()).map(([id, t]) => ({ id, nome: nomeEmpresa(id), t })).sort((a, b) => a.nome.localeCompare(b.nome))
  const linhasFuncao = Array.from(porFuncao.entries()).map(([nome, t]) => ({ nome, t })).sort((a, b) => b.t.colaboradores - a.t.colaboradores)

  const Colunas = () => (
    <>
      <th className="py-2 px-2 font-medium text-center">Pessoas</th>
      <th className="py-2 px-2 font-medium text-center">Média/dia</th>
      <th className="py-2 px-2 font-medium text-center">Folgas</th>
      <th className="py-2 px-2 font-medium text-center">Faltas</th>
      <th className="py-2 px-2 font-medium text-center">Atestados</th>
      <th className="py-2 px-2 font-medium text-center">Férias</th>
      <th className="py-2 px-2 font-medium text-center">Absent.</th>
      <th className="py-2 px-2 font-medium text-center">Alertas</th>
    </>
  )
  const Valores = ({ t }: { t: Totais }) => (
    <>
      <td className="py-2 px-2 text-center">{t.colaboradores}</td>
      <td className="py-2 px-2 text-center">{dias.length ? Math.round((t.T / dias.length) * 10) / 10 : 0}</td>
      <td className="py-2 px-2 text-center">{t.F}</td>
      <td className={`py-2 px-2 text-center ${t.FA ? 'text-red-600 font-semibold' : ''}`}>{t.FA}</td>
      <td className={`py-2 px-2 text-center ${t.AT ? 'text-amber-700 font-semibold' : ''}`}>{t.AT}</td>
      <td className={`py-2 px-2 text-center ${t.FE ? 'text-sky-700 font-semibold' : ''}`}>{t.FE}</td>
      <td className="py-2 px-2 text-center">{absenteismo(t)}%</td>
      <td className={`py-2 px-2 text-center ${t.alertas ? 'text-red-600 font-semibold' : ''}`}>{t.alertas}</td>
    </>
  )

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-3">
        <p className="text-sm font-medium">
          Escala de trabalho <span className="text-gray-400 font-normal">· 📅 {periodo.rotulo}</span>
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {empresas.length > 1 && <EmpresaSelector empresas={empresas} valorAtual={filtroEmpresa} incluirTodas />}
          <FiltroPeriodoEscala periodo={periodo} destino="/dashboard" manter={['empresa', 'visao']} />
          <Link href={`/escala${filtroEmpresa !== 'todas' ? `?empresa=${filtroEmpresa}` : ''}`} className="text-center border bg-white text-sm font-medium px-4 py-2 rounded-lg">Abrir a escala →</Link>
        </div>
      </div>
      {periodo.aviso && <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{periodo.aviso}</p>}

      {colabs.length === 0 ? (
        <div className="bg-white rounded-2xl border p-6 text-sm text-gray-600">
          Nenhum colaborador ativo nas empresas escolhidas. Cadastre a equipe em <Link href="/colaboradores" className="text-teal-700 font-medium underline">Colaboradores</Link>.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARDS.map((card) => (
              <div key={card.label} className={`relative overflow-hidden rounded-2xl border p-4 ${card.suave}`}>
                <div className={`absolute -right-3 -top-3 w-14 h-14 rounded-full bg-gradient-to-br ${card.fundo} opacity-10`} />
                <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${card.fundo} flex items-center justify-center text-lg mb-3 shadow-sm`}>{card.icone}</div>
                <p className="relative text-2xl font-bold text-gray-800 leading-none">{card.valor}</p>
                <p className="relative text-xs text-gray-500 mt-1.5">{card.label}</p>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-2xl border p-5">
            <p className="font-semibold text-sm mb-3">Por loja</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 pr-3 font-medium">Loja</th><Colunas /><th className="py-2 px-2 font-medium">Dia com menos gente</th></tr></thead>
                <tbody>
                  {linhasLoja.map((l) => {
                    const m = menorDia(l.id)
                    return (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium"><Link href={`/escala?empresa=${l.id}`} className="hover:text-teal-700">{l.nome}</Link></td>
                        <Valores t={l.t} />
                        <td className={`py-2 px-2 whitespace-nowrap ${m && m.n === 0 ? 'text-red-600 font-semibold' : ''}`}>{m ? `${DIAS_SEMANA[diaDaSemana(m.dia)]} ${diaBr(m.dia).slice(0, 5)} · ${m.n}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-2xl border p-5">
            <p className="font-semibold text-sm mb-3">Por função</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 pr-3 font-medium">Função</th><Colunas /></tr></thead>
                <tbody>
                  {linhasFuncao.map((l) => (
                    <tr key={l.nome} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{l.nome}</td>
                      <Valores t={l.t} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <section className="bg-white rounded-2xl border p-5">
              <p className="font-semibold text-sm mb-3">Ausentes {rotuloRef}</p>
              {ausentesRef.length === 0 ? (
                <p className="text-xs text-gray-500">Ninguém ausente.</p>
              ) : (
                <ul className="space-y-2">
                  {ausentesRef.map((h) => {
                    const o = ocorrenciaDoDia(ocorrencias, h.c.id, diaReferencia)
                    return (
                      <li key={h.c.id} className="text-xs">
                        <span className="font-medium">{h.c.nome_completo}</span>
                        <span className="text-gray-500"> · {o ? NOME_OCORRENCIA[o.tipo] : h.s} · {nomeEmpresa(h.c.empresa_id)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
            <section className="bg-white rounded-2xl border p-5">
              <p className="font-semibold text-sm mb-3">Mais ausências no período</p>
              {ranking.length === 0 ? (
                <p className="text-xs text-gray-500">Nenhuma falta, atestado ou férias no período.</p>
              ) : (
                <ul className="divide-y">
                  {ranking.slice(0, 10).map((r) => (
                    <li key={r.c.id} className="py-1.5 text-xs flex justify-between gap-2">
                      <span className="min-w-0 truncate"><span className="font-medium">{r.c.nome_completo}</span><span className="text-gray-400"> · {nomeEmpresa(r.c.empresa_id)}</span></span>
                      <span className="shrink-0 text-gray-600">{r.FA ? `${r.FA} FA ` : ''}{r.AT ? `${r.AT} AT ` : ''}{r.FE ? `${r.FE} FE` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="bg-white rounded-2xl border p-5">
              <p className="font-semibold text-sm mb-3">Alertas de folga</p>
              {alertas.length === 0 ? (
                <p className="text-xs text-gray-500">✓ Nenhum alerta no período.</p>
              ) : (
                <ul className="space-y-2">
                  {alertas.slice(0, 15).map((a, i) => (
                    <li key={i} className="text-xs text-gray-700 border-l-4 border-red-500 pl-3">{a.texto} <span className="text-gray-400">({a.loja})</span></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <p className="text-[11px] text-gray-400">
            Números em dias-pessoa: cada dia de cada colaborador conta 1. Absenteísmo = faltas + atestados sobre os dias que deveriam ser trabalhados (férias não entram).
          </p>
        </div>
      )}
    </div>
  )
}
