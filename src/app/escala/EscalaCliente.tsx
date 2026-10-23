'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabaseClient'
import EmpresaSelector from '@/components/EmpresaSelector'
import FiltroPeriodoEscala from './FiltroPeriodoEscala'
import {
  CONFIG_PADRAO, DIAS_SEMANA, NOME_OCORRENCIA, SIGLA_OCORRENCIA,
  diaDaSemana, hojeIso, horario, ocorrenciaDoDia, trabalhaPelaJornada,
  type ConfigColab, type Jornada, type Ocorrencia, type PeriodoEscala, type TipoOcorrencia,
} from '@/lib/escala'

interface Colaborador { id: string; nome_completo: string; funcao: string | null }
interface Ajuste { colaborador_id: string; dia: string; trabalha: boolean }

const COR: Record<string, string> = {
  T: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  F: 'bg-gray-500 text-white',
  FA: 'bg-red-600 text-white',
  AT: 'bg-amber-600 text-white',
  FE: 'bg-blue-600 text-white',
}

export default function EscalaCliente({
  empresas, empresaId, periodo, colaboradores, configs, ajustes: ajustesIniciais, ocorrencias,
}: {
  empresas: { id: string; nome_fantasia: string }[]
  empresaId: string
  periodo: PeriodoEscala
  colaboradores: Colaborador[]
  configs: ConfigColab[]
  ajustes: Ajuste[]
  ocorrencias: Ocorrencia[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [ajustes, setAjustes] = useState<Ajuste[]>(ajustesIniciais)
  const [editando, setEditando] = useState<Colaborador | null>(null)
  const [lancando, setLancando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const dias = periodo.dias
  const hoje = hojeIso()
  const empresaNome = empresas.find((e) => e.id === empresaId)?.nome_fantasia ?? ''

  const cfgDe = (id: string) => {
    const c = configs.find((x) => x.colaborador_id === id)
    return c ? { ...c, folgas: (c.folgas ?? []).map(Number) } : { ...CONFIG_PADRAO }
  }
  const trabalha = (id: string, dia: string) => {
    const a = ajustes.find((x) => x.colaborador_id === id && x.dia === dia)
    return a ? a.trabalha : trabalhaPelaJornada(cfgDe(id), dia)
  }
  const ajustado = (id: string, dia: string) => ajustes.some((x) => x.colaborador_id === id && x.dia === dia)

  // Situação de cada colaborador em cada dia: T, F, FA, AT ou FE
  function situacao(id: string, dia: string): string {
    const o = ocorrenciaDoDia(ocorrencias, id, dia)
    if (o) return SIGLA_OCORRENCIA[o.tipo]
    return trabalha(id, dia) ? 'T' : 'F'
  }

  async function alternar(c: Colaborador, dia: string) {
    if (ocorrenciaDoDia(ocorrencias, c.id, dia)) return
    setErro(null)
    const novo = !trabalha(c.id, dia)
    const padrao = trabalhaPelaJornada(cfgDe(c.id), dia)
    const anterior = ajustes
    if (novo === padrao) {
      setAjustes(ajustes.filter((x) => !(x.colaborador_id === c.id && x.dia === dia)))
      const { error } = await supabase.from('cj_escala_ajustes').delete().eq('colaborador_id', c.id).eq('dia', dia)
      if (error) { setAjustes(anterior); setErro('Não foi possível salvar a troca. Tente de novo.') }
    } else {
      setAjustes([...ajustes.filter((x) => !(x.colaborador_id === c.id && x.dia === dia)), { colaborador_id: c.id, dia, trabalha: novo }])
      const { error } = await supabase.from('cj_escala_ajustes').upsert({ colaborador_id: c.id, empresa_id: empresaId, dia, trabalha: novo })
      if (error) { setAjustes(anterior); setErro('Não foi possível salvar a troca. Tente de novo.') }
    }
  }

  // Agrupa por função
  const grupos = useMemo(() => {
    const mapa = new Map<string, Colaborador[]>()
    for (const c of colaboradores) {
      const f = c.funcao || 'Sem função'
      mapa.set(f, [...(mapa.get(f) ?? []), c])
    }
    return Array.from(mapa.entries())
  }, [colaboradores])

  // Totais e alertas
  const linhas = colaboradores.map((c) => {
    const sit = dias.map((d) => situacao(c.id, d))
    let seq = 0, maxSeq = 0, domingos = 0, domingosTrab = 0
    dias.forEach((d, i) => {
      if (sit[i] === 'T') { seq++; maxSeq = Math.max(maxSeq, seq) } else seq = 0
      if (diaDaSemana(d) === 0) { domingos++; if (sit[i] === 'T') domingosTrab++ }
    })
    return { c, sit, folgas: sit.filter((s) => s === 'F').length, trab: sit.filter((s) => s === 'T').length, maxSeq, domingos, domingosTrab }
  })
  const alertas: string[] = []
  for (const l of linhas) {
    const cfg = cfgDe(l.c.id)
    if (cfg.jornada !== '12x36' && l.maxSeq > 6) alertas.push(`${l.c.nome_completo} trabalha ${l.maxSeq} dias seguidos sem folga.`)
    if (cfg.jornada !== '12x36' && dias.length >= 28 && l.domingos > 0 && l.domingosTrab === l.domingos) alertas.push(`${l.c.nome_completo} trabalha todos os domingos do período. Confira a regra de folga aos domingos da convenção coletiva.`)
  }

  const hojeNoMes = dias.includes(hoje)
  const resumoHoje = hojeNoMes ? {
    trab: linhas.filter((l) => situacao(l.c.id, hoje) === 'T'),
    folga: linhas.filter((l) => situacao(l.c.id, hoje) === 'F'),
    ausentes: linhas.filter((l) => ['FA', 'AT', 'FE'].includes(situacao(l.c.id, hoje))),
  } : null

  function baixarExcel() {
    const cab = ['Colaborador', 'Função', 'Jornada', 'Horário', ...dias.map((d) => `${DIAS_SEMANA[diaDaSemana(d)]} ${d.slice(8)}`), 'Folgas', 'Trab.']
    const corpo = linhas.map((l) => {
      const cfg = cfgDe(l.c.id)
      return [l.c.nome_completo, l.c.funcao ?? '', cfg.jornada, cfg.hora_entrada ? `${horario(cfg.hora_entrada)}–${horario(cfg.hora_saida)}` : '', ...l.sit, l.folgas, l.trab]
    })
    const rodape = ['Total trabalhando', '', '', '', ...dias.map((_, i) => linhas.filter((l) => l.sit[i] === 'T').length), '', '']
    const planilha = XLSX.utils.aoa_to_sheet([
      [`Escala — ${empresaNome} — ${periodo.rotulo}`], [],
      cab, ...corpo, rodape, [],
      ['Legenda: T = trabalha · F = folga · FA = falta · AT = atestado · FE = férias'],
    ])
    planilha['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, ...dias.map(() => ({ wch: 6 })), { wch: 7 }, { wch: 7 }]
    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, planilha, 'Escala')
    const nomeArquivo = `escala-${empresaNome}-${dias[0]}-a-${dias[dias.length - 1]}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').toLowerCase()
    XLSX.writeFile(livro, `${nomeArquivo}.xlsx`)
  }

  async function removerOcorrencia(id: string) {
    const { error } = await supabase.from('cj_escala_ocorrencias').delete().eq('id', id)
    if (error) { setErro('Não foi possível remover. Tente de novo.'); return }
    router.refresh()
  }

  const link = (q: Record<string, string>) => `/escala?${new URLSearchParams({ empresa: empresaId, ...q }).toString()}`

  return (
    <div className="min-w-0">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold">Escala de Trabalho</h1>
          <p className="text-xs text-gray-500">Clique no dia para trocar trabalho ↔ folga. Ajuste a jornada de cada colaborador no ⚙️.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EmpresaSelector empresas={empresas} valorAtual={empresaId} />
          <FiltroPeriodoEscala periodo={periodo} />
          <div className="flex items-center gap-1">
            <Link href={link(periodo.anterior)} className="border bg-white rounded-lg px-3 py-2 text-sm" aria-label="Período anterior">◀</Link>
            <span className="border bg-white rounded-lg px-3 py-2 text-sm font-medium min-w-[9.5rem] text-center">{periodo.rotulo}</span>
            <Link href={link(periodo.proximo)} className="border bg-white rounded-lg px-3 py-2 text-sm" aria-label="Próximo período">▶</Link>
          </div>
          <button type="button" onClick={() => setLancando(true)} disabled={colaboradores.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">+ Falta, atestado ou férias</button>
          <button type="button" onClick={baixarExcel} disabled={colaboradores.length === 0} className="border bg-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">⬇️ Baixar Excel</button>
        </div>
      </div>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}
      {periodo.aviso && <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{periodo.aviso}</p>}

      {resumoHoje && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-2xl font-bold text-emerald-700">{resumoHoje.trab.length}</p>
            <p className="text-xs text-gray-500 mt-1">Trabalhando hoje</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-2xl font-bold text-gray-600">{resumoHoje.folga.length}</p>
            <p className="text-xs text-gray-500 mt-1">De folga hoje</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-2xl font-bold text-red-600">{resumoHoje.ausentes.length}</p>
            <p className="text-xs text-gray-500 mt-1">Ausentes hoje {resumoHoje.ausentes.length > 0 && `(${resumoHoje.ausentes.map((l) => l.c.nome_completo.split(' ')[0]).join(', ')})`}</p>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600 mb-3">
        {[['T', 'trabalha'], ['F', 'folga'], ['FA', 'falta'], ['AT', 'atestado'], ['FE', 'férias']].map(([s, n]) => (
          <span key={s} className="inline-flex items-center gap-1.5"><span className={`inline-flex items-center justify-center w-7 h-6 rounded text-[11px] font-bold ${COR[s]}`}>{s}</span>{n}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="relative inline-flex items-center justify-center w-7 h-6 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">T<span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-500" /></span>trocado pelo gestor</span>
      </div>

      {colaboradores.length === 0 ? (
        <div className="bg-white rounded-2xl border p-6 text-sm text-gray-600">
          Nenhum colaborador ativo nesta empresa. Cadastre a equipe em <Link href="/colaboradores" className="text-teal-700 font-medium underline">Colaboradores</Link>.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto mb-5">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-gray-500">
                <th className="sticky left-0 z-10 bg-white text-left font-medium p-2 min-w-[11rem] border-b">Colaborador</th>
                {dias.map((d) => (
                  <th key={d} className={`p-1 font-medium border-b text-center ${diaDaSemana(d) === 0 || diaDaSemana(d) === 6 ? 'bg-amber-50' : ''} ${d === hoje ? 'text-teal-700' : ''}`}>
                    {DIAS_SEMANA[diaDaSemana(d)].charAt(0)}<br />{Number(d.slice(8))}
                  </th>
                ))}
                <th className="p-2 font-medium border-b">Folgas</th>
                <th className="p-2 font-medium border-b">Trab.</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map(([funcao, lista]) => (
                <FragmentoGrupo key={funcao} funcao={funcao} colunas={dias.length + 3}>
                  {lista.map((c) => {
                    const l = linhas.find((x) => x.c.id === c.id)!
                    const cfg = cfgDe(c.id)
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="sticky left-0 z-10 bg-white p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate max-w-[9rem]" title={c.nome_completo}>{c.nome_completo}</p>
                              <p className="text-[11px] text-gray-400">{cfg.jornada}{cfg.hora_entrada ? ` · ${horario(cfg.hora_entrada)}–${horario(cfg.hora_saida)}` : ''}</p>
                            </div>
                            <button type="button" onClick={() => setEditando(c)} className="text-gray-400 hover:text-teal-700" title="Jornada e folgas">⚙️</button>
                          </div>
                        </td>
                        {dias.map((d, i) => {
                          const s = l.sit[i]
                          const eOcorrencia = ['FA', 'AT', 'FE'].includes(s)
                          return (
                            <td key={d} className={`p-0.5 text-center ${diaDaSemana(d) === 0 || diaDaSemana(d) === 6 ? 'bg-amber-50/60' : ''}`}>
                              <button
                                type="button"
                                disabled={eOcorrencia}
                                onClick={() => alternar(c, d)}
                                title={eOcorrencia ? 'Ausência lançada' : s === 'T' ? 'Trabalha — clique para dar folga' : 'Folga — clique para escalar'}
                                className={`relative w-7 h-6 rounded text-[11px] font-bold ${COR[s]} ${eOcorrencia ? 'cursor-default' : 'hover:ring-2 hover:ring-teal-500'}`}
                              >
                                {s}
                                {!eOcorrencia && ajustado(c.id, d) && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-500" />}
                              </button>
                            </td>
                          )
                        })}
                        <td className="p-2 text-center font-semibold">{l.folgas}</td>
                        <td className="p-2 text-center font-semibold">{l.trab}</td>
                      </tr>
                    )
                  })}
                </FragmentoGrupo>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="sticky left-0 z-10 bg-gray-50 p-2">Total trabalhando</td>
                {dias.map((d, i) => {
                  const n = linhas.filter((l) => l.sit[i] === 'T').length
                  return <td key={d} className={`p-1 text-center ${n === 0 ? 'text-red-600' : ''}`}>{n}</td>
                })}
                <td /><td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-2xl border p-5">
          <p className="font-semibold text-sm mb-3">Atenção</p>
          {alertas.length === 0 ? (
            <p className="text-xs text-gray-500">✓ Nenhum alerta de folga neste período.</p>
          ) : (
            <ul className="space-y-2">
              {alertas.map((a) => <li key={a} className="text-xs text-gray-700 border-l-4 border-red-500 pl-3">{a}</li>)}
            </ul>
          )}
        </section>
        <section className="bg-white rounded-2xl border p-5">
          <p className="font-semibold text-sm mb-3">Faltas, atestados e férias do período</p>
          {ocorrencias.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhuma ausência lançada neste período.</p>
          ) : (
            <ul className="divide-y">
              {ocorrencias.map((o) => {
                const c = colaboradores.find((x) => x.id === o.colaborador_id)
                return (
                  <li key={o.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold mr-2 ${COR[SIGLA_OCORRENCIA[o.tipo]]}`}>{SIGLA_OCORRENCIA[o.tipo]}</span>
                      <span className="font-medium">{c?.nome_completo ?? 'Colaborador'}</span>
                      <span className="text-gray-500"> · {o.inicio.split('-').reverse().join('/')}{o.fim !== o.inicio ? ` a ${o.fim.split('-').reverse().join('/')}` : ''}</span>
                      {o.observacao && <p className="text-gray-400 truncate">{o.observacao}</p>}
                    </div>
                    <button type="button" onClick={() => removerOcorrencia(o.id)} className="text-red-600 hover:underline shrink-0">Remover</button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {editando && (
        <ModalJornada
          colaborador={editando}
          empresaId={empresaId}
          inicial={cfgDe(editando.id)}
          onFechar={() => setEditando(null)}
          onSalvo={() => { setEditando(null); router.refresh() }}
        />
      )}
      {lancando && (
        <ModalOcorrencia
          colaboradores={colaboradores}
          empresaId={empresaId}
          diaInicial={hojeNoMes ? hoje : dias[0]}
          onFechar={() => setLancando(false)}
          onSalvo={() => { setLancando(false); router.refresh() }}
        />
      )}
    </div>
  )
}

function FragmentoGrupo({ funcao, colunas, children }: { funcao: string; colunas: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-gray-50">
        <td className="sticky left-0 z-10 bg-gray-50 px-2 py-1.5 font-semibold text-gray-600 text-[11px] uppercase tracking-wide">{funcao}</td>
        <td colSpan={colunas - 1} />
      </tr>
      {children}
    </>
  )
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onFechar}>
      <div className="bg-white rounded-xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <p className="font-medium text-sm mb-4">{titulo}</p>
        {children}
      </div>
    </div>,
    document.body
  )
}

function ModalJornada({ colaborador, empresaId, inicial, onFechar, onSalvo }: {
  colaborador: Colaborador
  empresaId: string
  inicial: Omit<ConfigColab, 'colaborador_id' | 'empresa_id'>
  onFechar: () => void
  onSalvo: () => void
}) {
  const supabase = createClient()
  const [jornada, setJornada] = useState<Jornada>(inicial.jornada)
  const [folgas, setFolgas] = useState<number[]>(inicial.folgas)
  const [inicio12, setInicio12] = useState(inicial.inicio_12x36 ?? hojeIso())
  const [entrada, setEntrada] = useState(horario(inicial.hora_entrada))
  const [saida, setSaida] = useState(horario(inicial.hora_saida))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const folgasEsperadas = jornada === '5x2' ? 2 : 1

  async function salvar() {
    setErro(null)
    if (jornada !== '12x36' && folgas.length !== folgasEsperadas) {
      setErro(`Na jornada ${jornada}, escolha ${folgasEsperadas} dia${folgasEsperadas > 1 ? 's' : ''} de folga.`)
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('cj_escala_colab').upsert({
      colaborador_id: colaborador.id,
      empresa_id: empresaId,
      jornada,
      folgas: jornada === '12x36' ? [] : folgas,
      inicio_12x36: jornada === '12x36' ? inicio12 : null,
      hora_entrada: entrada || null,
      hora_saida: saida || null,
      atualizado_em: new Date().toISOString(),
    })
    setSalvando(false)
    if (error) { setErro('Não foi possível salvar. Tente de novo.'); return }
    onSalvo()
  }

  return (
    <Modal titulo={`Jornada de ${colaborador.nome_completo}`} onFechar={onFechar}>
      <p className="text-xs text-gray-500 mb-1.5">Jornada</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['6x1', '5x2', '12x36'] as Jornada[]).map((j) => (
          <button key={j} type="button" onClick={() => setJornada(j)} className={`border rounded-lg py-2 text-sm ${jornada === j ? 'bg-teal-600 text-white border-teal-600' : 'bg-white'}`}>{j}</button>
        ))}
      </div>
      {jornada === '12x36' ? (
        <label className="block mb-4">
          <span className="text-xs text-gray-500">Um dia em que ele trabalha (o sistema alterna a partir dele)</span>
          <input type="date" value={inicio12} onChange={(e) => setInicio12(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
        </label>
      ) : (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1.5">Folga fixa na semana ({folgasEsperadas} dia{folgasEsperadas > 1 ? 's' : ''})</p>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((d, i) => (
              <button key={d} type="button"
                onClick={() => setFolgas(folgas.includes(i) ? folgas.filter((x) => x !== i) : [...folgas, i].sort())}
                className={`border rounded-lg px-2.5 py-1.5 text-xs ${folgas.includes(i) ? 'bg-gray-600 text-white border-gray-600' : 'bg-white'}`}>{d}</button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <label className="block"><span className="text-xs text-gray-500">Entrada</span>
          <input type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></label>
        <label className="block"><span className="text-xs text-gray-500">Saída</span>
          <input type="time" value={saida} onChange={(e) => setSaida(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></label>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">As trocas que você já fez dia a dia continuam valendo.</p>
      {erro && <p className="text-red-600 text-xs mb-3">{erro}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onFechar} className="flex-1 border rounded-lg py-2 text-sm">Cancelar</button>
        <button type="button" onClick={salvar} disabled={salvando} className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm disabled:opacity-60">{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </Modal>
  )
}

function ModalOcorrencia({ colaboradores, empresaId, diaInicial, onFechar, onSalvo }: {
  colaboradores: Colaborador[]
  empresaId: string
  diaInicial: string
  onFechar: () => void
  onSalvo: () => void
}) {
  const supabase = createClient()
  const [colaboradorId, setColaboradorId] = useState(colaboradores[0]?.id ?? '')
  const [tipo, setTipo] = useState<TipoOcorrencia>('falta')
  const [inicio, setInicio] = useState(diaInicial)
  const [fim, setFim] = useState(diaInicial)
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setErro(null)
    if (!colaboradorId || !inicio) return
    const fimFinal = fim && fim >= inicio ? fim : inicio
    setSalvando(true)
    const { error } = await supabase.from('cj_escala_ocorrencias').insert({
      empresa_id: empresaId, colaborador_id: colaboradorId, tipo, inicio, fim: fimFinal, observacao: observacao || null,
    })
    setSalvando(false)
    if (error) { setErro('Não foi possível salvar. Tente de novo.'); return }
    onSalvo()
  }

  return (
    <Modal titulo="Lançar falta, atestado ou férias" onFechar={onFechar}>
      <p className="text-xs text-gray-500 mb-1.5">Colaborador</p>
      <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-4">
        {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome_completo}{c.funcao ? ` (${c.funcao})` : ''}</option>)}
      </select>
      <p className="text-xs text-gray-500 mb-1.5">Tipo</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['falta', 'atestado', 'ferias'] as TipoOcorrencia[]).map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)} className={`border rounded-lg py-2 text-sm ${tipo === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white'}`}>{NOME_OCORRENCIA[t]}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <label className="block"><span className="text-xs text-gray-500">De</span>
          <input type="date" value={inicio} onChange={(e) => { setInicio(e.target.value); if (fim < e.target.value) setFim(e.target.value) }} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></label>
        <label className="block"><span className="text-xs text-gray-500">Até</span>
          <input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></label>
      </div>
      <input type="text" placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-4" />
      {erro && <p className="text-red-600 text-xs mb-3">{erro}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onFechar} className="flex-1 border rounded-lg py-2 text-sm">Cancelar</button>
        <button type="button" onClick={salvar} disabled={salvando || !colaboradorId} className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm disabled:opacity-60">{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </Modal>
  )
}
