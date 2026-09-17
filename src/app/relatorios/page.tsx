import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { empresa?: string }
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome_fantasia')
    .eq('dono_id', user.id)

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

  // Motivos de saída por função (pergunta 9 da entrevista de desligamento:
  // "O que mais pesou na sua decisão de sair/desligamento?")
  const { data: colaboradoresDaEmpresa } = await supabase
    .from('colaboradores')
    .select('id, funcao')
    .eq('empresa_id', empresaId ?? '00000000-0000-0000-0000-000000000000')

  const funcaoPorColaboradorId = Object.fromEntries(
    (colaboradoresDaEmpresa ?? []).map((c) => [c.id, c.funcao ?? 'Sem função'])
  )
  const colaboradorIds = (colaboradoresDaEmpresa ?? []).map((c) => c.id)

  const { data: respostasMotivo } = await supabase
    .from('respostas_saida')
    .select('colaborador_id, resposta')
    .eq('ordem', 9)
    .in('colaborador_id', colaboradorIds.length ? colaboradorIds : ['00000000-0000-0000-0000-000000000000'])

  const motivosPorFuncao: Record<string, Record<string, number>> = {}
  respostasMotivo?.forEach((r) => {
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

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/relatorios" />
      <main className="flex-1 pt-16 md:pt-6 p-4 md:p-6 pb-6">
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Relatórios</h1>
          <p className="text-xs text-gray-500">{empresaAtual?.nome_fantasia}</p>
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

        {/* Motivos de saída por função */}
        {Object.keys(motivosPorFuncao).length > 0 && (
          <div className="bg-white rounded-xl border p-4 mt-6">
            <p className="font-medium text-sm mb-1">Motivos de Saída por Função</p>
            <p className="text-xs text-gray-400 mb-4">Baseado nas respostas da pesquisa de desligamento</p>

            <div className="space-y-5">
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
                          {motivo} — <strong>{Math.round((qtd / totalRespostas) * 100)}%</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
