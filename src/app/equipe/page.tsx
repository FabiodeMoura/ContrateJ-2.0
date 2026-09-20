import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import EmpresaSelector from '@/components/EmpresaSelector'
import ConvidarUsuarioButton from './ConvidarUsuarioButton'
import RemoverMembroButton from './RemoverMembroButton'

// Regra: cada empresa pode ter até 2 usuários além do administrador (planos pagos).
const USUARIOS_POR_EMPRESA = 2

export default async function EquipePage({
  searchParams,
}: {
  searchParams: { empresa?: string }
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano')
    .eq('dono_id', user.id)
    .single()

  const plano = assinatura?.plano ?? 'Gratuito'
  const ilimitado = plano === 'Demonstração'
  const planoPago = plano !== 'Gratuito'

  // Só o administrador (dono das empresas) gerencia usuários.
  const { data: empresas } = await supabase
    .from('minhas_empresas')
    .select('id, nome_fantasia')
    .eq('dono_id', user.id)
    .order('nome_fantasia', { ascending: true })

  const listaEmpresas = empresas ?? []

  if (listaEmpresas.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50 md:pl-56">
        <Sidebar ativo="/equipe" />
        <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
          <h1 className="text-lg font-semibold mb-1">Usuários da conta</h1>
          <p className="text-sm text-gray-500 mt-4">
            Somente o administrador da conta pode cadastrar e remover usuários.
          </p>
        </main>
        <MobileNav />
      </div>
    )
  }

  const { data: membros } = await supabase
    .from('equipe')
    .select('id, empresa_id, membro_email, status')
    .eq('dono_id', user.id)
    .order('criado_em', { ascending: true })

  const lista = membros ?? []

  const empresasComUso = listaEmpresas.map((e) => ({
    id: e.id,
    nome_fantasia: e.nome_fantasia,
    usados: lista.filter((m) => m.empresa_id === e.id).length,
  }))
  const temVaga = (usados: number) => ilimitado || usados < USUARIOS_POR_EMPRESA

  // Filtro da lista: todas as empresas ou uma empresa
  const filtro =
    searchParams.empresa && listaEmpresas.some((e) => e.id === searchParams.empresa)
      ? searchParams.empresa
      : 'todas'
  const empresasExibidas = filtro === 'todas' ? empresasComUso : empresasComUso.filter((e) => e.id === filtro)

  const empresaPadraoConvite =
    (filtro !== 'todas' ? empresasComUso.find((e) => e.id === filtro && temVaga(e.usados)) : undefined)?.id ??
    empresasComUso.find((e) => temVaga(e.usados))?.id ??
    ''
  const podeConvidar = planoPago && empresaPadraoConvite !== ''

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/equipe" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
        <h1 className="text-lg font-semibold mb-1">Usuários da conta</h1>
        <p className="text-xs text-gray-500 mb-6">
          Cadastre pessoas do seu time por empresa. Cada usuário acessa apenas a empresa à qual foi vinculado.
        </p>

        <div className="bg-white rounded-2xl border p-5 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Plano <span className="text-teal-600">{plano}</span> —{' '}
              {ilimitado ? 'usuários ilimitados' : planoPago ? `até ${USUARIOS_POR_EMPRESA} usuários por empresa (além de você)` : 'só o administrador'}
            </p>
            {!planoPago && (
              <a href="/planos" className="text-xs font-medium text-indigo-600 hover:underline">
                Fazer upgrade →
              </a>
            )}
          </div>
          {!planoPago && (
            <p className="text-xs text-gray-500 mt-2">
              🔒 O plano Gratuito permite só o administrador. Os planos pagos liberam {USUARIOS_POR_EMPRESA} usuários por empresa.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <p className="font-medium text-sm">Usuários</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {listaEmpresas.length > 1 && (
                <EmpresaSelector empresas={listaEmpresas} valorAtual={filtro} incluirTodas />
              )}
              {podeConvidar && (
                <ConvidarUsuarioButton
                  empresas={empresasComUso}
                  empresaIdPadrao={empresaPadraoConvite}
                  limitePorEmpresa={ilimitado ? null : USUARIOS_POR_EMPRESA}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-lg px-3 py-2.5 mb-5">
            <div>
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-[11px] text-gray-400">Administrador — acesso a todas as empresas</p>
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 rounded-full px-2.5 py-1">Ativo</span>
          </div>

          <div className="space-y-5">
            {empresasExibidas.map((empresa) => {
              const usuarios = lista.filter((m) => m.empresa_id === empresa.id)
              const percentual = ilimitado ? 0 : Math.min(100, (empresa.usados / USUARIOS_POR_EMPRESA) * 100)
              return (
                <div key={empresa.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium">{empresa.nome_fantasia}</p>
                    <p className="text-xs text-gray-500">
                      {ilimitado
                        ? `${empresa.usados} usuário(s) — ilimitado`
                        : `${empresa.usados} de ${USUARIOS_POR_EMPRESA} usuários`}
                    </p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${percentual}%` }} />
                  </div>

                  <div className="space-y-2">
                    {usuarios.map((m) => (
                      <div key={m.id} className="flex items-center justify-between border rounded-lg px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{m.membro_email}</p>
                          <p className="text-[11px] text-gray-400">Usuário de {empresa.nome_fantasia}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                            m.status === 'Ativo'
                              ? 'text-green-600 bg-green-50'
                              : m.status === 'Suspenso'
                              ? 'text-red-600 bg-red-50'
                              : 'text-amber-600 bg-amber-50'
                          }`}>
                            {m.status === 'Ativo' ? 'Ativo' : m.status === 'Suspenso' ? 'Suspenso (plano encerrado)' : 'Aguardando cadastro'}
                          </span>
                          <RemoverMembroButton id={m.id} />
                        </div>
                      </div>
                    ))}
                    {usuarios.length === 0 && (
                      <p className="text-xs text-gray-400">Nenhum usuário cadastrado nesta empresa.</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!planoPago && (
            <p className="text-xs text-gray-400 text-center mt-5">
              Assine o Plano 79 ou 99 para cadastrar usuários.
            </p>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
