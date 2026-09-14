import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import SeletorStatus from './SeletorStatus'
import RecomendacaoBadge from './RecomendacaoBadge'
import ExportarExcelButton from './ExportarExcelButton'
import EmpresaSelector from '@/components/EmpresaSelector'

export default async function CandidatosPage({
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

  const { data: candidatos } = await supabase
    .from('candidatos')
    .select('id, nome_completo, email, whatsapp, percentual_aderencia, recomendacao, status, vagas ( funcao )')
    .in('vaga_id', vagaIds.length ? vagaIds : ['00000000-0000-0000-0000-000000000000'])
    .order('percentual_aderencia', { ascending: false })

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/candidatos" />
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold">Candidatos</h1>
            <p className="text-xs text-gray-500">
              {empresaAtual?.nome_fantasia} • {candidatos?.length ?? 0} candidatos avaliados
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            {empresas && empresas.length > 1 && (
              <EmpresaSelector empresas={empresas} valorAtual={empresaId ?? ''} />
            )}
            <ExportarExcelButton candidatos={candidatos ?? []} />
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b text-left">
                <th className="p-3 font-medium">Nome completo</th>
                <th className="p-3 font-medium">E-mail</th>
                <th className="p-3 font-medium">WhatsApp</th>
                <th className="p-3 font-medium">Vaga</th>
                <th className="p-3 font-medium">Aderência</th>
                <th className="p-3 font-medium">Recomendação</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidatos?.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.nome_completo}</td>
                  <td className="p-3 text-gray-500">{c.email}</td>
                  <td className="p-3 text-gray-500">{c.whatsapp}</td>
                  {/* @ts-expect-error - relação aninhada */}
                  <td className="p-3">{c.vagas?.funcao}</td>
                  <td className="p-3 font-semibold">
                    {c.percentual_aderencia != null ? `${c.percentual_aderencia}%` : '—'}
                  </td>
                  <td className="p-3">
                    <RecomendacaoBadge recomendacao={c.recomendacao} />
                  </td>
                  <td className="p-3">
                    <SeletorStatus candidatoId={c.id} statusAtual={c.status} recomendacao={c.recomendacao} />
                  </td>
                </tr>
              ))}
              {(!candidatos || candidatos.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400 text-sm">
                    Nenhum candidato avaliado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Ao mudar o status aqui, o dashboard e os relatórios são atualizados automaticamente.
        </p>
      </main>
      <MobileNav />
    </div>
  )
}
