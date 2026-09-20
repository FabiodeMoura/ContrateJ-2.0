import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import EmpresaSelector from '@/components/EmpresaSelector'
import { PERGUNTAS_SAIDA, PONTOS_DE_ATENCAO } from '@/lib/perguntasSaida'

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { empresa?: string; turnover?: string }
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresas } = await supabase
    .from('minhas_empresas')
    .select('id, nome_fantasia')

  const empresaId = searchParams.empresa ?? empresas?.[0]?.id
  const empresaAtual = empresas?.find((e) => e.id === empresaId)

  const { data: vagasDaEmpresa } = await supabase
    .from('vagas')
    .select('id, funcao')
    .eq('empresa_id', empresaId)

  const vagaIds = vagasDaEmpresa?.map((v) => v.id) ?? []
  const funcaoPorVagaId = Object.fromEntries((vagasDaEmpresa ?? []).map((v) => [v.id, v.funcao]))

  const { data: candidatos } = await supabase
    .from('candidatos')
    .select('vaga_id, status, percentual_aderencia')
    .in('vaga_id', vagaIds.length ? vagaIds : ['00000000-0000-0000-0000-000000000000'])

  const total = candidatos?.length ?? 0
  const entrevistados = candidatos?.filter((c) => c.status !== 'Em análise').length ?? 0
  const aprovados = candidatos?.filter((c) => c.status === 'Aprovado').length ?? 0
  const reprovados = candidatos?.filter((c) => c.status === 'Reprovado').length ?? 0

  const taxaAprovacao = total ? Math.round((aprovados / total) * 100) : 0

  const mediaGeral = total
    ? Math.round(
        (candidatos!.reduce((soma, c) => soma + (c.percentual_aderencia ?? 0), 0) / total) * 10
      ) / 10
    : 0

  const mediaAprovados = media(candidatos?.filter((c) => c.status === 'Aprovado') ?? [])
  const mediaReprovados = media(candidatos?.filter((c) => c.status === 'Reprovado') ?? [])

  // Aderência média por função
  const porFuncao: Record<string, number[]> = {}
  candidatos?.forEach((c) => {
    const funcao = funcaoPorVagaId[c.vaga_id] ?? 'Outra'
    if (c.percentual_aderencia == null) return
    porFuncao[funcao] = porFuncao[funcao] ?? []
    porFuncao[funcao].push(c.percentual_aderencia)
  })
  const rankingFuncoes = Object.entries(porFuncao)
    .map(([funcao, valores]) => ({ funcao, media: Math.round(media_(valores)) }))
    .sort((a, b) => b.media - a.media)

  function media(lista: { percentual_aderencia: number | null }[]) {
    const valores = lista.map((c) => c.percentual_aderencia ?? 0)
    return valores.length ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10 : 0
  }
  function media_(valores: number[]) {
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
  }

  // ---------- Turnover: filtro próprio (Todas as empresas ou uma empresa) ----------
  const listaEmpresas = empresas ?? []
  const turnoverEmpresaId =
    searchParams.turnover && listaEmpresas.some((e) => e.id === searchParams.turnover)
      ? searchParams.turnover
      : 'todas'
  const empresaIdsTurnover =
    turnoverEmpresaId === 'todas' ? listaEmpresas.map((e) => e.id) : [turnoverEmpresaId]
  const nomeEscopoTurnover =
    turnoverEmpresaId === 'todas'
      ? 'Todas as empresas'
      : listaEmpresas.find((e) => e.id === turnoverEmpresaId)?.nome_fantasia ?? ''

  const { data: colaboradoresDaEmpresa } = await supabase
    .from('colaboradores')
    .select('id, empresa_id, funcao, status, tipo_desligamento')
    .in('empresa_id', empresaIdsTurnover.length ? empresaIdsTurnover : ['00000000-0000-0000-0000-000000000000'])

  const funcaoPorColaboradorId = Object.fromEntries(
    (colaboradoresDaEmpresa ?? []).map((c) => [c.id, c.funcao ?? 'Sem função'])
  )
  const colaboradorIds = (colaboradoresDaEmpresa ?? []).map((c) => c.id)

  // Todas as respostas da pesquisa de desligamento. Busca em lotes porque o
  // Supabase devolve no máximo 1000 linhas por consulta.
  const respostasBrutas: { colaborador_id: string; ordem: number; resposta: string }[] = []
  for (let i = 0; i < colaboradorIds.length; i += 50) {
    const { data: lote } = await supabase
      .from('respostas_saida')
      .select('colaborador_id, ordem, resposta')
      .in('colaborador_id', colaboradorIds.slice(i, i + 50))
    if (lote) respostasBrutas.push(...lote)
  }

  // Se alguém respondeu a mesma pergunta duas vezes, vale só a primeira.
  const respostasUnicas = new Map<string, { colaborador_id: string; ordem: number; resposta: string }>()
  respostasBrutas.forEach((r) => {
    const chave = `${r.colaborador_id}|${r.ordem}`
    if (!respostasUnicas.has(chave)) respostasUnicas.set(chave, r)
  })
  const respostasSaida = Array.from(respostasUnicas.values())
  const totalRespondentes = new Set(respostasSaida.map((r) => r.colaborador_id)).size

  // Soma por pergunta e por resposta (ex.: pergunta 6 -> { Ruim: 2, Regular: 1, ... })
  const contagemPorPergunta: Record<number, Record<string, number>> = {}
  respostasSaida.forEach((r) => {
    contagemPorPergunta[r.ordem] = contagemPorPergunta[r.ordem] ?? {}
    contagemPorPergunta[r.ordem][r.resposta] = (contagemPorPergunta[r.ordem][r.resposta] ?? 0) + 1
  })
  const totalPorPergunta = (ordem: number) =>
    Object.values(contagemPorPergunta[ordem] ?? {}).reduce((a, b) => a + b, 0)

  // "3 colaboradores apontaram o clima da empresa" (pontos críticos, do mais citado ao menos)
  const pontosApontados = PONTOS_DE_ATENCAO.map((ponto) => {
    const contagem = contagemPorPergunta[ponto.ordem] ?? {}
    const quantidade = ponto.negativas.reduce((soma, opcao) => soma + (contagem[opcao] ?? 0), 0)
    const base = totalPorPergunta(ponto.ordem)
    return { ...ponto, quantidade, percentual: base ? Math.round((quantidade / base) * 100) : 0 }
  })
    .filter((ponto) => ponto.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade)

  // Motivos de saída por função (pergunta 9: "O que mais pesou na sua decisão de sair?")
  const motivosPorFuncao: Record<string, Record<string, number>> = {}
  respostasSaida
    .filter((r) => r.ordem === 9)
    .forEach((r) => {
      const funcao = funcaoPorColaboradorId[r.colaborador_id] ?? 'Sem função'
      motivosPorFuncao[funcao] = motivosPorFuncao[funcao] ?? {}
      motivosPorFuncao[funcao][r.resposta] = (motivosPorFuncao[funcao][r.resposta] ?? 0) + 1
    })

  const CORES_MOTIVO: Record<string, string> = {
    'Salário': 'bg-red-500',
    'Ambiente de trabalho': 'bg-orange-500',
    'Gestão/liderança': 'bg-amber-500',
    'Oportunidade em outro lugar': 'bg-teal-500',
    'Outro motivo': 'bg-gray-400',
  }

  // Turnover geral e quebra por tipo de desligamento (Pediu demissão x Foi demitido)
  const totalColaboradores = colaboradoresDaEmpresa?.length ?? 0
  const desligadosLista = colaboradoresDaEmpresa?.filter((c) => c.status === 'Desligado') ?? []
  const totalDesligados = desligadosLista.length
  const turnoverGeral = totalColaboradores > 0
    ? Math.round((totalDesligados / totalColaboradores) * 1000) / 10
    : 0
  const pedidosDemissao = desligadosLista.filter((c) => c.tipo_desligamento === 'Pediu demissão').length
  const demissoes = desligadosLista.filter((c) => c.tipo_desligamento === 'Foi demitido').length

  const tipoPorFuncao: Record<string, Record<string, number>> = {}
  desligadosLista.forEach((c) => {
    if (!c.tipo_desligamento) return
    const funcao = c.funcao ?? 'Sem função'
    tipoPorFuncao[funcao] = tipoPorFuncao[funcao] ?? {}
    tipoPorFuncao[funcao][c.tipo_desligamento] = (tipoPorFuncao[funcao][c.tipo_desligamento] ?? 0) + 1
  })

  const CORES_TIPO: Record<string, string> = {
    'Pediu demissão': 'bg-amber-500',
    'Foi demitido': 'bg-red-500',
  }

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/relatorios" />
      <main className="flex-1 pt-16 md:pt-6 p-4 md:p-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold">Relatórios</h1>
            <p className="text-xs text-gray-500">{empresaAtual?.nome_fantasia}</p>
          </div>
          {empresas && empresas.length > 1 && (
            <EmpresaSelector empresas={empresas} valorAtual={empresaId ?? ''} />
          )}
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi cor="from-green-400 to-green-600" label="Taxa de Aprovação" valor={`${taxaAprovacao}%`} />
          <Kpi cor="from-purple-400 to-purple-600" label="Aderência Média" valor={`${mediaGeral}%`} />
          <Kpi cor="from-blue-400 to-blue-600" label="Candidatos Avaliados" valor={`${total}`} />
          <Kpi cor="from-orange-400 to-orange-600" label="Entrevistados" valor={`${entrevistados}`} />
        </section>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Funil */}
          <div className="bg-white rounded-xl border p-4">
            <p className="font-medium text-sm mb-3">Funil de Contratação</p>
            <BarraFunil label="Avaliados" valor={total} max={total || 1} cor="bg-indigo-500" />
            <BarraFunil label="Entrevistados" valor={entrevistados} max={total || 1} cor="bg-indigo-500" />
            <BarraFunil label="Aprovados" valor={aprovados} max={total || 1} cor="bg-green-500" />
            <BarraFunil label="Reprovados" valor={reprovados} max={total || 1} cor="bg-red-500" />
          </div>

          {/* Aprovados x Reprovados */}
          <div className="bg-white rounded-xl border p-4">
            <p className="font-medium text-sm mb-3">Aderência: Aprovados x Reprovados</p>
            <div className="flex items-end justify-center gap-10 h-32">
              <div className="text-center">
                <div
                  className="w-14 bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg flex items-start justify-center pt-1 text-white text-xs font-semibold"
                  style={{ height: `${Math.max(mediaAprovados, 5)}%` }}
                >
                  {mediaAprovados}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Aprovados</p>
              </div>
              <div className="text-center">
                <div
                  className="w-14 bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg flex items-start justify-center pt-1 text-white text-xs font-semibold"
                  style={{ height: `${Math.max(mediaReprovados, 5)}%` }}
                >
                  {mediaReprovados}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Reprovados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Aderência por função */}
        <div className="bg-white rounded-xl border p-4">
          <p className="font-medium text-sm mb-3">Aderência Média por Função</p>
          {rankingFuncoes.length === 0 && (
            <p className="text-sm text-gray-400">Ainda não há candidatos suficientes.</p>
          )}
          {rankingFuncoes.map((item) => (
            <div key={item.funcao} className="flex items-center gap-3 mb-2">
              <span className="w-32 text-xs shrink-0">{item.funcao}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded">
                <div
                  className="h-full bg-indigo-500 rounded"
                  style={{ width: `${item.media}%` }}
                />
              </div>
              <span className="text-xs font-semibold w-10 text-right">{item.media}%</span>
            </div>
          ))}
        </div>

        {/* Turnover: totais, tipo de desligamento e respostas da entrevista de saída */}
        <div id="turnover" className="bg-white rounded-xl border p-4 mt-6 scroll-mt-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <p className="font-medium text-sm mb-1">Turnover</p>
              <p className="text-xs text-gray-400">
                Colaboradores efetivados e entrevista de desligamento — <strong>{nomeEscopoTurnover}</strong>
              </p>
            </div>
            {listaEmpresas.length > 1 && (
              <EmpresaSelector
                empresas={listaEmpresas}
                valorAtual={turnoverEmpresaId}
                incluirTodas
                parametro="turnover"
                ancora="turnover"
              />
            )}
          </div>

          {totalColaboradores === 0 ? (
            <p className="text-xs text-gray-400">Nenhum colaborador cadastrado para {nomeEscopoTurnover}.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <MiniKpi label="Colaboradores" valor={`${totalColaboradores}`} />
                <MiniKpi label="Desligados" valor={`${totalDesligados}`} />
                <MiniKpi label="Turnover" valor={`${turnoverGeral}%`} />
                <MiniKpi label="Pediu demissão x Foi demitido" valor={`${pedidosDemissao} x ${demissoes}`} />
              </div>

              {Object.keys(tipoPorFuncao).length > 0 && (
                <div className="space-y-5 mb-6">
                  <p className="text-xs font-medium text-gray-600">Tipo de desligamento por função</p>
                  {Object.entries(tipoPorFuncao).map(([funcao, tipos]) => {
                    const totalTipos = Object.values(tipos).reduce((a, b) => a + b, 0)
                    return (
                      <div key={funcao}>
                        <p className="text-sm font-medium mb-2">{funcao}</p>
                        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-2">
                          {Object.entries(tipos).map(([tipo, qtd]) => (
                            <div
                              key={tipo}
                              className={CORES_TIPO[tipo] ?? 'bg-gray-400'}
                              style={{ width: `${(qtd / totalTipos) * 100}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                          {Object.entries(tipos).map(([tipo, qtd]) => (
                            <span key={tipo} className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${CORES_TIPO[tipo] ?? 'bg-gray-400'}`} />
                              {tipo} — <strong>{qtd}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {totalRespondentes === 0 ? (
                <p className="text-xs text-gray-400 pt-4 border-t">
                  Ainda não há respostas da pesquisa de desligamento. Assim que os colaboradores desligados
                  responderem, os pontos apontados aparecem aqui, somados e em percentual.
                </p>
              ) : (
                <>
                  {/* Pontos apontados: soma de quem citou cada problema */}
                  <div className="pt-5 border-t mb-6">
                    <p className="text-xs font-medium text-gray-600">Pontos apontados pelos colaboradores</p>
                    <p className="text-[11px] text-gray-400 mb-3">
                      {textoColaboradores(totalRespondentes)} {totalRespondentes === 1 ? 'respondeu' : 'responderam'} a
                      pesquisa de desligamento. O percentual considera quem respondeu cada pergunta.
                    </p>
                    {pontosApontados.length === 0 ? (
                      <p className="text-xs text-gray-400">Nenhum ponto negativo apontado até agora.</p>
                    ) : (
                      pontosApontados.map((ponto) => (
                        <div key={ponto.ordem} className="mb-3">
                          <div className="flex justify-between gap-3 text-sm mb-1">
                            <span>
                              <strong>{fraseApontaram(ponto.quantidade)}</strong> {ponto.frase}
                            </span>
                            <span className="font-semibold text-gray-700">{ponto.percentual}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${ponto.percentual}%` }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Todas as perguntas da pesquisa, com soma e percentual por resposta */}
                  <div className="pt-5 border-t mb-6">
                    <p className="text-xs font-medium text-gray-600 mb-3">Todas as respostas da pesquisa de desligamento</p>
                    {PERGUNTAS_SAIDA.map((pergunta) => {
                      const contagem = contagemPorPergunta[pergunta.ordem] ?? {}
                      const base = totalPorPergunta(pergunta.ordem)
                      return (
                        <details key={pergunta.ordem} open className="border rounded-lg mb-2">
                          <summary className="cursor-pointer text-sm font-medium px-3 py-2">
                            {pergunta.ordem}. {pergunta.texto}{' '}
                            <span className="text-xs text-gray-400 font-normal">
                              ({base} {base === 1 ? 'resposta' : 'respostas'})
                            </span>
                          </summary>
                          <div className="px-3 pb-3 pt-1 space-y-2">
                            {pergunta.opcoes.map((opcao) => {
                              const qtd = contagem[opcao] ?? 0
                              const pct = base ? Math.round((qtd / base) * 100) : 0
                              return (
                                <div key={opcao}>
                                  <div className="flex justify-between gap-3 text-xs mb-1">
                                    <span>{opcao}</span>
                                    <span className="text-gray-600">
                                      {textoColaboradores(qtd)} — <strong>{pct}%</strong>
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${CORES_MOTIVO[opcao] ?? 'bg-indigo-500'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </>
              )}

              {Object.keys(motivosPorFuncao).length > 0 && (
                <div className="space-y-5 pt-5 border-t">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Motivos de saída por função</p>
                    <p className="text-[11px] text-gray-400">Baseado na pergunta "O que mais pesou na sua decisão de sair (ou no desligamento)?" da pesquisa de desligamento</p>
                  </div>
                  {Object.entries(motivosPorFuncao).map(([funcao, motivos]) => {
                    const totalRespostas = Object.values(motivos).reduce((a, b) => a + b, 0)
                    return (
                      <div key={funcao}>
                        <p className="text-sm font-medium mb-2">{funcao}</p>
                        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-2">
                          {Object.entries(motivos).map(([motivo, qtd]) => (
                            <div
                              key={motivo}
                              className={CORES_MOTIVO[motivo] ?? 'bg-gray-400'}
                              style={{ width: `${(qtd / totalRespostas) * 100}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                          {Object.entries(motivos).map(([motivo, qtd]) => (
                            <span key={motivo} className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${CORES_MOTIVO[motivo] ?? 'bg-gray-400'}`} />
                              {motivo} — <strong>{qtd}</strong> ({Math.round((qtd / totalRespostas) * 100)}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

function Kpi({ cor, label, valor }: { cor: string; label: string; valor: string }) {
  return (
    <div className={`bg-gradient-to-br ${cor} text-white rounded-xl p-4`}>
      <p className="text-[11px] opacity-90">{label}</p>
      <p className="text-2xl font-bold">{valor}</p>
    </div>
  )
}

function MiniKpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border">
      <p className="text-lg font-bold text-gray-800">{valor}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function BarraFunil({ label, valor, max, cor }: { label: string; valor: number; max: number; cor: string }) {
  const largura = Math.round((valor / max) * 100)
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-semibold">{valor}</span>
      </div>
      <div className="h-5 bg-gray-100 rounded">
        <div className={`h-full rounded ${cor}`} style={{ width: `${largura}%` }} />
      </div>
    </div>
  )
}

function textoColaboradores(qtd: number) {
  return qtd === 1 ? '1 colaborador' : `${qtd} colaboradores`
}

function fraseApontaram(qtd: number) {
  return qtd === 1 ? '1 colaborador apontou' : `${qtd} colaboradores apontaram`
}
