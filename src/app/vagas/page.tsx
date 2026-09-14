import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import NovaVagaButton from './NovaVagaButton'
import AcoesVaga from './AcoesVaga'

export default async function VagasPage({
  searchParams,
}: {
  searchParams: { empresa?: string }
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome_fantasia, segmento_principal')
    .eq('dono_id', user.id)

  const empresaId = searchParams.empresa ?? empresas?.[0]?.id
  const empresaAtual = empresas?.find((e) => e.id === empresaId)

  const { data: vagas } = await supabase
    .from('vagas')
    .select('id, funcao, status, token_link, candidatos ( id, percentual_aderencia )')
    .eq('empresa_id', empresaId)
    .order('criado_em', { ascending: false })

  const { data: perfis } = await supabase.from('perfis_disc').select('id, funcao').order('funcao')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar ativo="/vagas" />
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold">Vagas</h1>
            <p className="text-xs text-gray-500">
              {empresaAtual?.nome_fantasia ?? 'Selecione uma empresa'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            {empresas && empresas.length > 1 && (
              <form>
                <select
                  name="empresa"
                  defaultValue={empresaId}
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                  ))}
                </select>
              </form>
            )}
            {empresaId && perfis && (
              <NovaVagaButton empresaId={empresaId} perfis={perfis} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b text-left">
                <th className="p-3 font-medium">Função</th>
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
                      <AcoesVaga vagaId={vaga.id} token={vaga.token_link} funcao={vaga.funcao} nomeEmpresa={empresaAtual?.nome_fantasia ?? ''} />
                    </td>
                  </tr>
                )
              })}
              {(!vagas || vagas.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400 text-sm">
                    Nenhuma vaga gerada ainda. Clique em &quot;Nova vaga&quot; pra começar.
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
