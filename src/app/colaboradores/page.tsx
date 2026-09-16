import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import EmpresaSelector from '@/components/EmpresaSelector'
import StatusBadge from '@/components/StatusBadge'
import BaixarModeloButton from './BaixarModeloButton'
import ImportarPlanilhaButton from './ImportarPlanilhaButton'
import AdicionarColaboradorButton from './AdicionarColaboradorButton'
import AcaoColaborador from './AcaoColaborador'
import EditarColaboradorButton from './EditarColaboradorButton'

export default async function ColaboradoresPage({
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

  const filtroEmpresa = searchParams.empresa ?? 'todas'
  const empresaIds = filtroEmpresa === 'todas'
    ? (empresas?.map((e) => e.id) ?? [])
    : [filtroEmpresa]

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id, empresa_id, nome_completo, email, whatsapp, cpf, funcao, status, criado_em, empresas ( nome_fantasia )')
    .in('empresa_id', empresaIds.length ? empresaIds : ['00000000-0000-0000-0000-000000000000'])
    .order('criado_em', { ascending: false })

  const total = colaboradores?.length ?? 0
  const ativos = colaboradores?.filter((c) => c.status === 'Ativo').length ?? 0
  const desligados = colaboradores?.filter((c) => c.status === 'Desligado').length ?? 0
  const turnover = total > 0 ? Math.round((desligados / total) * 1000) / 10 : 0

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/colaboradores" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
          <div>
            <h1 className="text-lg font-semibold">Colaboradores</h1>
            <p className="text-xs text-gray-500">
              Base de colaboradores efetivados e controle de turnover
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            {empresas && empresas.length > 1 && (
              <EmpresaSelector empresas={empresas} valorAtual={filtroEmpresa} incluirTodas />
            )}
            <BaixarModeloButton />
            <ImportarPlanilhaButton empresas={empresas ?? []} />
            {empresas && empresas.length > 0 && (
              <AdicionarColaboradorButton empresas={empresas} />
            )}
          </div>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-base mb-3">🧑‍🤝‍🧑</div>
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500 mt-1.5">Total de colaboradores</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-base mb-3">✅</div>
            <p className="text-2xl font-bold text-gray-800">{ativos}</p>
            <p className="text-xs text-gray-500 mt-1.5">Ativos</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-base mb-3">🚪</div>
            <p className="text-2xl font-bold text-gray-800">{desligados}</p>
            <p className="text-xs text-gray-500 mt-1.5">Desligados</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-base mb-3">📉</div>
            <p className="text-2xl font-bold text-gray-800">{turnover}%</p>
            <p className="text-xs text-gray-500 mt-1.5">Turnover</p>
          </div>
        </section>

        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b text-left">
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Empresa</th>
                <th className="p-3 font-medium">Função</th>
                <th className="p-3 font-medium">WhatsApp</th>
                <th className="p-3 font-medium">CPF</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {colaboradores?.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.nome_completo}</td>
                  {/* @ts-expect-error - relação aninhada */}
                  <td className="p-3">{c.empresas?.nome_fantasia}</td>
                  <td className="p-3">{c.funcao ?? '—'}</td>
                  <td className="p-3">{c.whatsapp ?? '—'}</td>
                  <td className="p-3">{c.cpf ?? '—'}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <AcaoColaborador id={c.id} status={c.status} />
                      <EditarColaboradorButton
                        id={c.id}
                        nomeAtual={c.nome_completo}
                        emailAtual={c.email}
                        whatsappAtual={c.whatsapp}
                        cpfAtual={c.cpf}
                        funcaoAtual={c.funcao}
                        empresaIdAtual={c.empresa_id}
                        empresas={empresas ?? []}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {(!colaboradores || colaboradores.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400">
                    Nenhum colaborador cadastrado ainda. Baixe o modelo e importe sua planilha.
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
