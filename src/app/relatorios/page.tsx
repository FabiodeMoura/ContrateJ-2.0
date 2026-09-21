import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import EmpresaSelector from '@/components/EmpresaSelector'
import FiltroPeriodo from '@/components/FiltroPeriodo'
import { ParametrosPeriodo, resolverPeriodo, aplicarPeriodo, estaNoPeriodo } from '@/lib/periodo'
import { PERGUNTAS_SAIDA, PONTOS_DE_ATENCAO, TITULO_CURTO } from '@/lib/perguntasSaida'

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { empresa?: string; turnover?: string } & ParametrosPeriodo
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Calendário: vale para o funil de contratação e para o turnover
  const periodo = resolverPeriodo(searchParams)

  const { data: empresas } = await supabase
    .from('minhas_empresas')
    .select('id, nome_fantasia')

  const empresasDaConta = empresas ?? []
  const variasEmpresas = empresasDaConta.length > 1
  // Com mais de uma empresa, os números mostram todas por padrão; o filtro escolhe uma só.
  const filtroFunil =
    searchParams.empresa && empresasDaConta.some((e) => e.id === searchParams.empresa)
      ? searchParams.empresa
      : variasEmpresas
      ? 'todas'
      : empresasDaConta[0]?.id ?? ''
  const nomeEscopoFunil =
    filtroFunil === 'todas'
      ? `Todas as empresas (${empresasDaConta.length})`
      : empresasDaConta.find((e) => e.id === filtroFunil)?.nome_fantasia ?? ''
  const idsFunil = filtroFunil === 'todas' ? empresasDaConta.map((e) => e.id) : [filtroFunil]

  const { data: vagasDaEmpresa } = await supabase
    .from('vagas')
    .select('id, funcao')
    .in('empresa_id', idsFunil.length ? idsFunil : ['00000000-0000-0000-0000-000000000000'])

  const vagaIds = vagasDaEmpresa?.map((v) => v.id) ?? []
  const funcaoPorVagaId = Object.fromEntries((vagasDaEmpresa ?? []).map((v) => [v.id, v.funcao]))

  // Busca em lotes: com várias empresas a lista de vagas pode ficar grande demais para uma consulta só.
  const candidatos: { vaga_id: string; status: string; percentual_aderencia: number | null }[] = []
  for (let i = 0; i < vagaIds.length; i += 100) {
    const { data: lote } = await aplicarPeriodo(
      supabase
        .from('candidatos')
        .select('vaga_id, status, percentual_aderencia')
        .in('vaga_id', vagaIds.slice(i, i + 100)),
      'criado_em',
      periodo
    )
    if (lote) candidatos.push(...lote)
  }

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
    .select('id, empresa_id, funcao, status, tipo_desligamento, criado_em, desligado_em')
    .in('empresa_id', empresaIdsTurnover.length ? empresaIdsTurnover : ['00000000-0000-0000-0000-000000000000'])

  const funcaoPorColaboradorId = Object.fromEntries(
    (colaboradoresDaEmpresa ?? []).map((c) => [c.id, c.funcao ?? 'Sem função'])
  )
  const colaboradorIds = (colaboradoresDaEmpresa ?? []).map((c) => c.id)

  // Todas as respostas da pesquisa de desligamento. Busca em lotes porque o
  // Supabase devolve no máximo 1000 linhas por consulta.
  const respostasBrutas: { colaborador_id: string; ordem: number; resposta: string }[] = []
  for (let i = 0; i < colaboradorIds.length; i += 50) {
    const { data: lote } = await aplicarPeriodo(
      supabase
        .from('respostas_saida')
        .select('colaborador_id, ordem, resposta')
        .in('colaborador_id', colaboradorIds.slice(i, i + 50)),
      'criado_em',
      periodo
    )
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

  // Cores das respostas: verde = positivo, amarelo = meio termo, vermelho = negativo.
  const CORES_MOTIVO: Record<string, string> = {
    // motivos da saída (pergunta 9)
    'Salário': 'bg-red-500',
    'Ambiente de trabalho': 'bg-orange-500',
    'Gestão/liderança': 'bg-amber-500',
    'Oportunidade em outro lugar': 'bg-teal-500',
    'Outro motivo': 'bg-gray-400',
    // demais perguntas
    'Ótima': 'bg-green-600',
    'Ótimo': 'bg-green-600',
    'Boa': 'bg-green-400',
    'Bom': 'bg-green-400',
    'Sim': 'bg-green-500',
    'Sim, com certeza': 'bg-green-500',
    'Sempre': 'bg-green-500',
    'Regular': 'bg-amber-400',
    'Talvez': 'bg-amber-400',
    'Às vezes': 'bg-amber-400',
    'Parcialmente': 'bg-amber-400',
    'Ruim': 'bg-red-500',
    'Não': 'bg-red-500',
    'Raramente': 'bg-red-500',
    'Nunca': 'bg-red-600',
    'Não sei dizer': 'bg-gray-300',
  }

  // Turnover geral e quebra por tipo de desligamento (Pediu demissão x Foi demitido)
  // Com um período escolhido: base = colaboradores cadastrados até o fim do período;
  // desligados = quem saiu dentro do período (pela data de desligamento).
  const todosColaboradores = colaboradoresDaEmpresa ?? []
  const baseColaboradores = periodo.fim
    ? todosColaboradores.filter((c) => new Date(c.criado_em).getTime() < new Date(periodo.fim as string).getTime())
    : todosColaboradores
  const totalColaboradores = baseColaboradores.length
  const desligadosLista = todosColaboradores.filter(
    (c) => c.status === 'Desligado' && estaNoPeriodo(c.desligado_em, periodo)
  )
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
            <p className="text-xs text-gray-500">
              {nomeEscopoFunil}
              {periodo.tipo !== 'todos' && <span> · 📅 {periodo.rotulo}</span>}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <EmpresaSelector empresas={empresasDaConta} valorAtual={filtroFunil} incluirTodas={variasEmpresas} />
            <FiltroPeriodo />
          </div>
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

        {/* Turnover: resumo visual + entrevista de desligamento */}
        <div id="turnover" className="bg-white rounded-xl border p-4 mt-6 scroll-mt-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <p className="font-medium text-sm mb-1">Turnover</p>
              <p className="text-xs text-gray-400">
                Colaboradores e entrevista de desligamento — <strong>{nomeEscopoTurnover}</strong>
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
              {/* Resumo: anel do turnover + números */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
                <AnelTurnover valor={turnoverGeral} />
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <MiniKpi icone="👥" label="Colaboradores" valor={`${totalColaboradores}`} />
                  <MiniKpi icone="🚪" label="Desligados" valor={`${totalDesligados}`} />
                  <MiniKpi icone="🔁" label="Pediu demissão x Foi demitido" valor={`${pedidosDemissao} x ${demissoes}`} />
                </div>
              </div>

              {/* Como saíram + principal motivo, lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <BarrasPorFuncao
                  titulo="Como saíram"
                  dados={tipoPorFuncao}
                  cores={CORES_TIPO}
                  geral={{ 'Pediu demissão': pedidosDemissao, 'Foi demitido': demissoes }}
                  vazio="Nenhum desligamento registrado."
                />
                <BarrasPorFuncao
                  titulo="Principal motivo da saída"
                  dados={motivosPorFuncao}
                  cores={CORES_MOTIVO}
                  geral={contagemPorPergunta[9]}
                  vazio="Aguardando as respostas da pesquisa."
                />
              </div>

              {totalRespondentes === 0 ? (
                <p className="text-xs text-gray-400 pt-4 border-t">
                  Ainda não há respostas da pesquisa de desligamento. Quando os colaboradores desligados
                  responderem, os pontos apontados aparecem aqui, somados e em percentual.
                </p>
              ) : (
                <>
                  {/* Pontos apontados: um card por ponto, com o percentual em destaque */}
                  <div className="pt-4 border-t mb-5">
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                      <p className="text-xs font-medium text-gray-600">Pontos apontados</p>
                      <p className="text-[11px] text-gray-400">
                        {textoColaboradores(totalRespondentes)} {totalRespondentes === 1 ? 'respondeu' : 'responderam'} a pesquisa
                      </p>
                    </div>
                    {pontosApontados.length === 0 ? (
                      <p className="text-xs text-gray-400">Nenhum ponto negativo apontado até agora.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pontosApontados.map((ponto) => {
                          const tom =
                            ponto.percentual >= 50
                              ? { card: 'border-red-200 bg-red-50', numero: 'text-red-700', barra: 'bg-red-400' }
                              : ponto.percentual >= 25
                              ? { card: 'border-amber-200 bg-amber-50', numero: 'text-amber-700', barra: 'bg-amber-400' }
                              : { card: 'border-yellow-200 bg-yellow-50', numero: 'text-yellow-700', barra: 'bg-yellow-400' }
                          return (
                            <div key={ponto.ordem} className={`rounded-xl border p-3 ${tom.card}`}>
                              <p className={`text-3xl font-bold leading-none ${tom.numero}`}>{ponto.percentual}%</p>
                              <p className="text-xs text-gray-700 mt-2">
                                <strong>{fraseApontaram(ponto.quantidade)}</strong> {ponto.frase}
                              </p>
                              <div className="h-1.5 bg-white/70 rounded-full overflow-hidden mt-2.5">
                                <div className={`h-full rounded-full ${tom.barra}`} style={{ width: `${ponto.percentual}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Respostas da pesquisa: um card por pergunta (só as respostas que apareceram) */}
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-3">Respostas da pesquisa</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {PERGUNTAS_SAIDA.map((pergunta) => {
                        const contagem = contagemPorPergunta[pergunta.ordem] ?? {}
                        const base = totalPorPergunta(pergunta.ordem)
                        const presentes = pergunta.opcoes.filter((o) => (contagem[o] ?? 0) > 0)
                        return (
                          <div key={pergunta.ordem} className="rounded-xl border bg-white shadow-sm p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-xs font-semibold text-gray-800 leading-snug" title={pergunta.texto}>
                                {TITULO_CURTO[pergunta.ordem]}
                              </p>
                              <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                                {base} {base === 1 ? 'resposta' : 'respostas'}
                              </span>
                            </div>
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-2">
                              {presentes.map((o) => (
                                <div
                                  key={o}
                                  className={CORES_MOTIVO[o] ?? 'bg-indigo-500'}
                                  style={{ width: `${(contagem[o] / base) * 100}%` }}
                                  title={`${o}: ${textoColaboradores(contagem[o])}`}
                                />
                              ))}
                            </div>
                            <div className="space-y-0.5 text-[11px] text-gray-600">
                              {presentes.length === 0 ? (
                                <span className="text-gray-400">sem respostas</span>
                              ) : (
                                presentes.map((o) => (
                                  <div key={o} className="flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${CORES_MOTIVO[o] ?? 'bg-indigo-500'}`} />
                                      {o}
                                    </span>
                                    <span>
                                      <strong>{contagem[o]}</strong> · {Math.round((contagem[o] / base) * 100)}%
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
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

function MiniKpi({ label, valor, icone }: { label: string; valor: string; icone?: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border shadow-sm">
      {icone && <p className="text-base mb-1">{icone}</p>}
      <p className="text-lg font-bold text-gray-800 leading-tight">{valor}</p>
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

// Anel com o percentual de turnover.
function AnelTurnover({ valor }: { valor: number }) {
  const raio = 34
  const circunferencia = 2 * Math.PI * raio
  const preenchido = (Math.min(Math.max(valor, 0), 100) / 100) * circunferencia
  return (
    <div className="relative w-24 h-24 shrink-0 mx-auto sm:mx-0">
      <svg viewBox="0 0 88 88" className="w-24 h-24 -rotate-90">
        <circle cx="44" cy="44" r={raio} fill="none" stroke="#e5e7eb" strokeWidth="9" />
        <circle
          cx="44"
          cy="44"
          r={raio}
          fill="none"
          stroke="#6366f1"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${circunferencia}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-800 leading-none">{valor}%</span>
        <span className="text-[10px] text-gray-500 mt-0.5">turnover</span>
      </div>
    </div>
  )
}

// Cartão com uma barra empilhada por função e a legenda uma única vez.
function BarrasPorFuncao({
  titulo,
  dados,
  cores,
  geral,
  vazio,
}: {
  titulo: string
  dados: Record<string, Record<string, number>>
  cores: Record<string, string>
  geral?: Record<string, number>
  vazio: string
}) {
  const funcoes = Object.entries(dados)
  const legenda = Array.from(new Set(funcoes.flatMap(([, valores]) => Object.keys(valores))))
  return (
    <div className="border rounded-xl p-3">
      <p className="text-xs font-medium text-gray-600 mb-2">{titulo}</p>
      {funcoes.length === 0 ? (
        <p className="text-xs text-gray-400">{vazio}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2 text-[11px] text-gray-600">
            {legenda.map((item) => (
              <span key={item} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${cores[item] ?? 'bg-gray-400'}`} />
                {item}
              </span>
            ))}
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {funcoes.length > 1 && geral && <LinhaBarra nome="Geral" valores={geral} cores={cores} destaque />}
            {funcoes.map(([funcao, valores]) => (
              <LinhaBarra key={funcao} nome={funcao} valores={valores} cores={cores} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LinhaBarra({
  nome,
  valores,
  cores,
  destaque,
}: {
  nome: string
  valores: Record<string, number>
  cores: Record<string, string>
  destaque?: boolean
}) {
  const total = Object.values(valores).reduce((a, b) => a + b, 0)
  if (!total) return null
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-24 shrink-0 truncate ${destaque ? 'font-semibold text-gray-800' : 'text-gray-600'}`} title={nome}>
        {nome}
      </span>
      <div className="flex h-3 flex-1 rounded-full overflow-hidden bg-gray-100">
        {Object.entries(valores).map(([chave, qtd]) => (
          <div
            key={chave}
            className={cores[chave] ?? 'bg-gray-400'}
            style={{ width: `${(qtd / total) * 100}%` }}
            title={`${chave}: ${qtd} (${Math.round((qtd / total) * 100)}%)`}
          />
        ))}
      </div>
      <span className="w-6 text-right text-gray-500">{total}</span>
    </div>
  )
}

function textoColaboradores(qtd: number) {
  return qtd === 1 ? '1 colaborador' : `${qtd} colaboradores`
}

function fraseApontaram(qtd: number) {
  return qtd === 1 ? '1 colaborador apontou' : `${qtd} colaboradores apontaram`
}
