import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import NovaVagaButton from './NovaVagaButton'
import AcoesVaga from './AcoesVaga'
import EmpresaSelector from '@/components/EmpresaSelector'
import FiltroPeriodo from '@/components/FiltroPeriodo'
import { ParametrosPeriodo, resolverPeriodo, aplicarPeriodo } from '@/lib/periodo'
import Link from 'next/link'
import { SEGMENTOS_INFO } from '@/lib/segmentos'

export default async function VagasPage({
  searchParams,
}: {
  searchParams: { empresa?: string } & ParametrosPeriodo
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresas } = await supabase
    .from('minhas_empresas')
    .select('id, nome_fantasia, segmento_principal')

  const listaEmpresas = empresas ?? []
  const varias = listaEmpresas.length > 1
  // Com mais de uma empresa a lista mostra todas por padrão; o filtro escolhe uma só.
  const filtro =
    searchParams.empresa && listaEmpresas.some((e) => e.id === searchParams.empresa)
      ? searchParams.empresa
      : varias
      ? 'todas'
      : listaEmpresas[0]?.id ?? ''
  const empresaId = filtro !== 'todas' ? filtro : listaEmpresas[0]?.id // empresa padrão do "+ Nova vaga"
  const idsVisiveis = filtro === 'todas' ? listaEmpresas.map((e) => e.id) : [filtro]
  const nomePorEmpresaId: Record<string, string> = Object.fromEntries(
    listaEmpresas.map((e) => [e.id, e.nome_fantasia])
  )

  // Calendário: vagas geradas no dia, mês, ano ou intervalo escolhido
  const periodo = resolverPeriodo(searchParams)
  const consultaVagas = aplicarPeriodo(
    supabase
      .from('vagas')
      .select('id, funcao, status, token_link, empresa_id, criado_em, candidatos ( id, percentual_aderencia )')
      .in('empresa_id', idsVisiveis.length ? idsVisiveis : ['00000000-0000-0000-0000-000000000000']),
    'criado_em',
    periodo
  ).order('criado_em', { ascending: false })
  const { data: vagas } = await consultaVagas

  const { data: perfis } = await supabase.from('perfis_disc').select('id, funcao').order('funcao')

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/vagas" />
      <main className="flex-1 pt-16 md:pt-6 p-4 md:p-6 pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold">Vagas</h1>
            <p className="text-xs text-gray-500">
              {filtro === 'todas'
                ? `Todas as empresas (${listaEmpresas.length})`
                : nomePorEmpresaId[filtro] ?? 'Selecione uma empresa'}
              {periodo.tipo !== 'todos' && <span> · 📅 {periodo.rotulo}</span>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            <EmpresaSelector empresas={listaEmpresas} valorAtual={filtro} incluirTodas={varias} />
            <FiltroPeriodo />
            {empresaId && perfis && (
              <NovaVagaButton empresas={empresas ?? []} empresaIdPadrao={empresaId} perfis={perfis} />
            )}
          </div>
        </div>

        <p className="text-sm font-medium mb-3">Criar vaga por segmento</p>
        <section className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {Object.entries(SEGMENTOS_INFO).map(([nome, info]) => (
            <Link
              key={nome}
              href={`/segmento/${nome.toLowerCase()}${varias && filtro !== 'todas' ? `?empresa=${filtro}` : ''}`}
              className={`bg-gradient-to-br ${info.cor} text-white rounded-xl p-4 text-center hover:opacity-90 hover:scale-[1.03] transition shadow-sm`}
            >
              <div className="text-2xl mb-1">{info.emoji}</div>
              <p className="text-xs font-semibold">{nome}</p>
            </Link>
          ))}
        </section>

        <p className="text-sm font-medium mb-3">Todas as vagas</p>
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b text-left">
                <th className="p-3 font-medium">Função</th>
                {varias && <th className="p-3 font-medium">Empresa</th>}
                <th className="p-3 font-medium">Candidatos</th>
                <th className="p-3 font-medium">Aderência média</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vagas?.map((vaga) => {
                const candidatosVaga = (vaga as any).candidatos ?? []
                const medias = candidatosVaga
                  .map((c: any) => c.percentual_aderencia)
                  .filter((v: number | null) => v != null)
                const media = medias.length
                  ? Math.round(medias.reduce((a: number, b: number) => a + b, 0) / medias.length)
                  : null

                return (
                  <tr key={vaga.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{vaga.funcao}</td>
                    {varias && <td className="p-3 text-gray-600">{nomePorEmpresaId[vaga.empresa_id] ?? ''}</td>}
                    <td className="p-3">{candidatosVaga.length}</td>
                    <td className="p-3">{media != null ? `${media}%` : '—'}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          vaga.status === 'Ativa'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {vaga.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <AcoesVaga vagaId={vaga.id} token={vaga.token_link} funcao={vaga.funcao} nomeEmpresa={nomePorEmpresaId[vaga.empresa_id] ?? ''} />
                    </td>
                  </tr>
                )
              })}
              {(!vagas || vagas.length === 0) && (
                <tr>
                  <td colSpan={varias ? 6 : 5} className="p-6 text-center text-gray-400 text-sm">
                    {periodo.tipo === 'todos'
                      ? 'Nenhuma vaga gerada ainda. Clique em "Nova vaga" pra começar.'
                      : `Nenhuma vaga gerada em ${periodo.rotulo.toLowerCase()}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
