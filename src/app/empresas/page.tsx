import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import EditarEmpresaButton from '@/components/EditarEmpresaButton'
import { souAdministrador } from '@/lib/permissoes'

export default async function EmpresasPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Só o administrador (dono da conta) cadastra empresas e edita os dados delas.
  if (!(await souAdministrador(supabase, user.id))) redirect('/dashboard')

  const { data: empresas } = await supabase
    .from('minhas_empresas')
    .select('id, nome_fantasia, segmento_principal, cnpj, logo_url, criado_em')
    .order('criado_em', { ascending: true })

  const empresasDaConta = empresas ?? []
  const idsTodasEmpresas = empresasDaConta.map((e) => e.id)

  const { data: vagasPorEmpresa } = await supabase
    .from('vagas')
    .select('empresa_id, status')
    .in('empresa_id', idsTodasEmpresas.length ? idsTodasEmpresas : ['00000000-0000-0000-0000-000000000000'])
  const { data: colaboradoresPorEmpresa } = await supabase
    .from('colaboradores')
    .select('empresa_id, status')
    .in('empresa_id', idsTodasEmpresas.length ? idsTodasEmpresas : ['00000000-0000-0000-0000-000000000000'])
  const { data: usuariosPorEmpresa } = await supabase
    .from('equipe')
    .select('empresa_id')
    .in('empresa_id', idsTodasEmpresas.length ? idsTodasEmpresas : ['00000000-0000-0000-0000-000000000000'])

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('limite_empresas')
    .eq('dono_id', user.id)
    .maybeSingle()

  const empresasComResumo = empresasDaConta.map((e) => ({
    ...e,
    vagasAtivas: (vagasPorEmpresa ?? []).filter((v) => v.empresa_id === e.id && v.status === 'Ativa').length,
    colaboradoresAtivos: (colaboradoresPorEmpresa ?? []).filter((c) => c.empresa_id === e.id && c.status === 'Ativo').length,
    usuarios: (usuariosPorEmpresa ?? []).filter((u) => u.empresa_id === e.id).length,
  }))

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/empresas" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
        <h1 className="text-lg font-semibold mb-1">Empresas cadastradas</h1>
        <p className="text-xs text-gray-500 mb-6">
          {empresasComResumo.length} de {assinatura?.limite_empresas ?? 1} empresa(s) que o seu plano permite cadastrar.
          Cada pacote comprado libera +1 empresa e +2 usuários por empresa.
        </p>

        <div className="space-y-2">
          {empresasComResumo.map((e) => (
            <div key={e.id} className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{e.nome_fantasia}</p>
                <p className="text-xs text-gray-500">
                  {e.segmento_principal ?? 'Sem segmento'}
                  {e.cnpj && <span> · CNPJ {e.cnpj}</span>}
                </p>
                <p className="text-[11px] text-gray-400">
                  Cadastrada em {new Date(e.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </p>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 text-center shrink-0">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{e.vagasAtivas}</p>
                  <p className="text-[10px] text-gray-400">vagas ativas</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{e.colaboradoresAtivos}</p>
                  <p className="text-[10px] text-gray-400">colaboradores</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{e.usuarios}</p>
                  <p className="text-[10px] text-gray-400">usuários</p>
                </div>
                <EditarEmpresaButton empresa={e} />
              </div>
            </div>
          ))}
          {empresasComResumo.length === 0 && (
            <p className="text-sm text-gray-400">Nenhuma empresa cadastrada ainda.</p>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
