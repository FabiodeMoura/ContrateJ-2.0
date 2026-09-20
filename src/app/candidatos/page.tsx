import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import SeletorStatus from './SeletorStatus'
import RecomendacaoBadge from './RecomendacaoBadge'
import ExportarExcelButton from './ExportarExcelButton'
import AdicionarCandidatoButton from './AdicionarCandidatoButton'
import EmpresaSelector from '@/components/EmpresaSelector'
import GerarLinkEntrevista from './GerarLinkEntrevista'

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: { empresa?: string }
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

  const { data: candidatos } = await supabase
    .from('candidatos')
    .select('id, nome_completo, email, whatsapp, percentual_aderencia, recomendacao, status, link_entrevista, vagas ( funcao )')
    .in('vaga_id', vagaIds.length ? vagaIds : ['00000000-0000-0000-0000-000000000000'])
    .order('percentual_aderencia', { ascending: false })

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/candidatos" />
      <main className="flex-1 pt-16 md:pt-6 p-4 md:p-6 pb-6">
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
            <div className="flex flex-col items-end gap-1">
              <AdicionarCandidatoButton vagas={vagasDaEmpresa ?? []} />
              {(!vagasDaEmpresa || vagasDaEmpresa.length === 0) && (
                <p className="text-[11px] text-amber-600">Crie uma vaga antes (aba "Vagas") pra poder cadastrar candidatos</p>
              )}
            </div>
            <ExportarExcelButton candidatos={candidatos ?? []} />
          </div>
        </div>

        {/* Celular: lista em cartões, com tudo visível sem precisar rolar pro lado */}
        <div className="md:hidden space-y-3">
          {candidatos?.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-sm">{c.nome_completo}</p>
                  {/* @ts-expect-error - relação aninhada */}
                  <p className="text-xs text-gray-400">{c.vagas?.funcao}</p>
                </div>
                <p className="font-semibold text-sm shrink-0">
                  {c.percentual_aderencia != null ? `${c.percentual_aderencia}%` : '—'}
                </p>
              </div>
              <p className="text-xs text-gray-500 mb-1">{c.email}</p>
              <p className="text-xs text-gray-500 mb-3">{c.whatsapp}</p>
              <div className="flex items-center justify-between gap-2 mb-3">
                <RecomendacaoBadge recomendacao={c.recomendacao} />
                <SeletorStatus candidatoId={c.id} statusAtual={c.status} recomendacao={c.recomendacao} />
              </div>
              <div className="pt-3 border-t">
                <p className="text-[11px] text-gray-400 mb-1.5">Entrevista por vídeo</p>
                <GerarLinkEntrevista candidatoId={c.id} nomeCandidato={c.nome_completo} linkExistente={c.link_entrevista} />
              </div>
            </div>
          ))}
          {(!candidatos || candidatos.length === 0) && (
            <p className="text-center text-gray-400 text-sm py-6 bg-white rounded-xl border">
              Nenhum candidato avaliado ainda.
            </p>
          )}
        </div>

        {/* Desktop/tablet: tabela completa */}
        <div className="hidden md:block bg-white rounded-xl border overflow-x-auto">
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
                <th className="p-3 font-medium">Entrevista</th>
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
                  <td className="p-3">
                    <GerarLinkEntrevista candidatoId={c.id} nomeCandidato={c.nome_completo} linkExistente={c.link_entrevista} />
                  </td>
                </tr>
              ))}
              {(!candidatos || candidatos.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-400 text-sm">
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
