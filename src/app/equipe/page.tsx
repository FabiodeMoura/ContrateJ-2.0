import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import ConvidarUsuarioButton from './ConvidarUsuarioButton'
import RemoverMembroButton from './RemoverMembroButton'

export default async function EquipePage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano')
    .eq('dono_id', user.id)
    .single()

  const plano = assinatura?.plano ?? 'Gratuito'
  const limiteUsuarios = plano === 'Gratuito' ? 1 : 3

  const { data: membros } = await supabase
    .from('equipe')
    .select('id, membro_email, status')
    .eq('dono_id', user.id)
    .order('criado_em', { ascending: true })

  const totalUsuarios = 1 + (membros?.length ?? 0) // 1 = você (administrador)

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/equipe" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
        <h1 className="text-lg font-semibold mb-1">Usuários da conta</h1>
        <p className="text-xs text-gray-500 mb-6">
          Convide pessoas do seu time pra acessar o mesmo painel, vagas e candidatos.
        </p>

        <div className="bg-white rounded-2xl border p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              Plano <span className="text-teal-600">{plano}</span> — {totalUsuarios} de {limiteUsuarios} usuário(s)
            </p>
            {plano === 'Gratuito' && (
              <a href="/planos" className="text-xs font-medium text-indigo-600 hover:underline">
                Fazer upgrade →
              </a>
            )}
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full"
              style={{ width: `${Math.min(100, (totalUsuarios / limiteUsuarios) * 100)}%` }}
            />
          </div>
          {plano === 'Gratuito' && (
            <p className="text-xs text-gray-500 mt-2">
              🔒 O plano Gratuito permite só o administrador. Os planos pagos liberam até 3 usuários (você + 2 convidados).
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-medium text-sm">Usuários</p>
            {plano !== 'Gratuito' && totalUsuarios < limiteUsuarios && (
              <ConvidarUsuarioButton />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between border rounded-lg px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-[11px] text-gray-400">Administrador</p>
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 rounded-full px-2.5 py-1">Ativo</span>
            </div>

            {membros?.map((m) => (
              <div key={m.id} className="flex items-center justify-between border rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{m.membro_email}</p>
                  <p className="text-[11px] text-gray-400">Usuário convidado</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                    m.status === 'Ativo' ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'
                  }`}>
                    {m.status === 'Ativo' ? 'Ativo' : 'Aguardando cadastro'}
                  </span>
                  <RemoverMembroButton id={m.id} />
                </div>
              </div>
            ))}
          </div>

          {plano === 'Gratuito' && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Assine o Plano 79 ou 99 pra convidar sua equipe.
            </p>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
