import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import EscalaCliente from './EscalaCliente'
import { LINK_COMPRA_ESCALA, PRECO_ESCALA, periodoEscala } from '@/lib/escala'

// Módulo Escala de Trabalho — vendido à parte (R$ 49,90/mês).
// Quem tem o módulo vê a escala; quem não tem vê a apresentação com o botão de compra.
export default async function EscalaPage({
  searchParams,
}: {
  searchParams: { empresa?: string; mes?: string; p?: string; m?: string; d?: string; de?: string; ate?: string }
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: situacao } = await supabase.rpc('escala_situacao')
  const liberada = !!situacao?.liberada
  const administrador = !!situacao?.administrador

  if (!liberada) {
    return (
      <div className="flex min-h-screen bg-gray-50 md:pl-56">
        <Sidebar ativo="/escala" />
        <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
          <VendaEscala administrador={administrador} encerrada={situacao?.status === 'encerrada' || situacao?.status === 'cancelamento_agendado'} />
        </main>
        <MobileNav />
      </div>
    )
  }

  const { data: empresas } = await supabase.from('minhas_empresas').select('id, nome_fantasia').order('nome_fantasia')
  const lista = empresas ?? []
  const empresaId = lista.find((e) => e.id === searchParams.empresa)?.id ?? lista[0]?.id ?? null
  const periodo = periodoEscala(searchParams)
  const dias = periodo.dias
  const inicio = dias[0]
  const fim = dias[dias.length - 1]

  let colaboradores: { id: string; nome_completo: string; funcao: string | null }[] = []
  let configs: any[] = []
  let ajustes: any[] = []
  let ocorrencias: any[] = []

  if (empresaId) {
    const [c, cfg, aj, oc] = await Promise.all([
      supabase.from('colaboradores').select('id, nome_completo, funcao').eq('empresa_id', empresaId).eq('status', 'Ativo').order('funcao').order('nome_completo'),
      supabase.from('cj_escala_colab').select('*').eq('empresa_id', empresaId),
      supabase.from('cj_escala_ajustes').select('colaborador_id, dia, trabalha').eq('empresa_id', empresaId).gte('dia', inicio).lte('dia', fim),
      supabase.from('cj_escala_ocorrencias').select('id, colaborador_id, empresa_id, tipo, inicio, fim, observacao').eq('empresa_id', empresaId).lte('inicio', fim).gte('fim', inicio).order('inicio'),
    ])
    colaboradores = c.data ?? []
    configs = cfg.data ?? []
    ajustes = aj.data ?? []
    ocorrencias = oc.data ?? []
  }

  const acessoAte = situacao?.status === 'cancelamento_agendado' && situacao?.acesso_ate
    ? new Date(situacao.acesso_ate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : null

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/escala" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8 min-w-0">
        {acessoAte && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm text-amber-800">
            A assinatura da Escala foi cancelada. O acesso continua até <strong>{acessoAte}</strong>.
          </div>
        )}
        {lista.length === 0 ? (
          <div className="bg-white rounded-2xl border p-6 text-sm text-gray-600">
            Cadastre uma empresa e os colaboradores dela para montar a escala.
          </div>
        ) : (
          <EscalaCliente
            empresas={lista}
            empresaId={empresaId!}
            periodo={periodo}
            colaboradores={colaboradores}
            configs={configs}
            ajustes={ajustes}
            ocorrencias={ocorrencias}
          />
        )}
      </main>
      <MobileNav />
    </div>
  )
}

function VendaEscala({ administrador, encerrada }: { administrador: boolean; encerrada: boolean }) {
  const recursos = [
    { icone: '🗓️', titulo: 'Escala do mês em um clique', texto: 'Monte a escala 6x1, 5x2 ou 12x36 de cada colaborador e troque folga e trabalho clicando no dia.' },
    { icone: '🚨', titulo: 'Faltas, atestados e férias', texto: 'Lance as ausências e veja na hora quem está trabalhando e quem falta em cada dia.' },
    { icone: '⚠️', titulo: 'Alertas automáticos', texto: 'Aviso quando alguém passa de 6 dias seguidos sem folga ou trabalha todos os domingos do mês.' },
    { icone: '📥', titulo: 'Baixe em Excel', texto: 'Exporte a escala pronta, com as cores de trabalho, folga e ausências, para imprimir ou mandar no grupo.' },
    { icone: '🏢', titulo: 'Todas as suas lojas', texto: 'Usa as empresas e os colaboradores que você já tem no ContrateJá. Nada para cadastrar de novo.' },
    { icone: '📱', titulo: 'Funciona no celular', texto: 'O gerente consulta e ajusta a escala de onde estiver.' },
  ]
  return (
    <div className="max-w-4xl">
      <div className="rounded-3xl bg-gradient-to-br from-slate-700 via-teal-600 to-lime-500 text-white p-6 md:p-8 mb-6">
        <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 rounded-full px-2.5 py-1">Novo módulo</span>
        <h1 className="text-2xl md:text-3xl font-bold mt-3 mb-2">Escala de Trabalho</h1>
        <p className="text-white/90 max-w-xl">
          Organize as folgas da equipe, controle faltas e férias e saiba todo dia quem está trabalhando em cada loja.
        </p>
        <p className="mt-5 text-3xl font-bold">{PRECO_ESCALA}<span className="text-base font-normal text-white/80">/mês</span></p>
        <p className="text-xs text-white/80 mt-1">Vendido à parte. Funciona com qualquer plano do ContrateJá, inclusive o gratuito.</p>
        <div className="mt-5">
          {!administrador ? (
            <p className="text-sm bg-white/15 rounded-xl px-4 py-3 w-fit">
              Peça ao administrador da conta para ativar a Escala.
            </p>
          ) : LINK_COMPRA_ESCALA ? (
            <a
              href={LINK_COMPRA_ESCALA}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-teal-700 font-semibold rounded-xl px-6 py-3 shadow hover:bg-lime-50 transition"
            >
              {encerrada ? 'Assinar a Escala de novo' : 'Assinar a Escala'}
            </a>
          ) : (
            <span className="inline-block bg-white/20 font-semibold rounded-xl px-6 py-3">Em breve</span>
          )}
        </div>
        {administrador && (
          <p className="text-xs text-white/80 mt-3">Use na compra o mesmo e-mail da sua conta do ContrateJá. A liberação é automática.</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recursos.map((r) => (
          <div key={r.titulo} className="bg-white rounded-2xl border p-5">
            <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center text-lg mb-3">{r.icone}</div>
            <p className="font-semibold text-sm mb-1">{r.titulo}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{r.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
