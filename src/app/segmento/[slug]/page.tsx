import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import GerarLinkCard from './GerarLinkCard'

// Mapa de segmento -> funções e visual de cada segmento.
// (Não existe coluna "segmento" em perfis_disc, então o vínculo é feito aqui.)
const SEGMENTOS: Record<
  string,
  { nome: string; emoji: string; cor: string; funcoes: string[] }
> = {
  restaurante: {
    nome: 'Restaurante',
    emoji: '🍽️',
    cor: 'from-orange-400 to-orange-600',
    funcoes: [
      'Garçom', 'Cozinheiro', 'Auxiliar de Cozinha', 'Chapeiro', 'Gerente',
      'Subgerente', 'Supervisor de Operações', 'Caixa', 'Recepcionista',
      'Segurança', 'Motoboy/Entregador', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal',
    ],
  },
  bar: {
    nome: 'Bar',
    emoji: '🍸',
    cor: 'from-pink-400 to-pink-600',
    funcoes: ['Bartender', 'Garçom', 'Cozinheiro', 'Segurança', 'Caixa', 'Gerente', 'Subgerente', 'Serviços Gerais'],
  },
  lanchonete: {
    nome: 'Lanchonete',
    emoji: '🍔',
    cor: 'from-yellow-400 to-yellow-600',
    funcoes: ['Atendente', 'Cozinheiro', 'Chapeiro', 'Caixa', 'Motoboy/Entregador', 'Gerente', 'Serviços Gerais'],
  },
  padaria: {
    nome: 'Padaria',
    emoji: '🍞',
    cor: 'from-sky-400 to-sky-600',
    funcoes: ['Padeiro', 'Confeiteiro', 'Atendente', 'Caixa', 'Gerente', 'Serviços Gerais', 'Financeiro'],
  },
  'sacolão': {
    nome: 'Sacolão',
    emoji: '🥬',
    cor: 'from-green-400 to-green-600',
    funcoes: ['Atendente/Repositor', 'Repositor', 'Açougueiro', 'Caixa', 'Motorista', 'Gerente', 'Serviços Gerais'],
  },
  sacolao: {
    nome: 'Sacolão',
    emoji: '🥬',
    cor: 'from-green-400 to-green-600',
    funcoes: ['Atendente/Repositor', 'Repositor', 'Açougueiro', 'Caixa', 'Motorista', 'Gerente', 'Serviços Gerais'],
  },
  pizzaria: {
    nome: 'Pizzaria',
    emoji: '🍕',
    cor: 'from-red-400 to-red-600',
    funcoes: ['Pizzaiolo', 'Cozinheiro', 'Atendente', 'Motoboy/Entregador', 'Caixa', 'Gerente', 'Serviços Gerais'],
  },
}

const ICONES_FUNCAO: Record<string, string> = {
  'Açougueiro': '🥩',
  'Analista Fiscal': '📊',
  'Atendente': '🙋',
  'Atendente/Repositor': '🛒',
  'Auxiliar de Cozinha': '🔪',
  'Bartender': '🍸',
  'Caixa': '💳',
  'Chapeiro': '🍔',
  'Confeiteiro': '🎂',
  'Cozinheiro': '👨‍🍳',
  'Financeiro': '💰',
  'Garçom': '🍴',
  'Gerente': '👔',
  'Motoboy/Entregador': '🛵',
  'Motorista': '🚚',
  'Padeiro': '🥖',
  'Pizzaiolo': '🍕',
  'Recepcionista': '📋',
  'Repositor': '📦',
  'Segurança': '🛡️',
  'Serviços Gerais': '🧹',
  'Subgerente': '🗂️',
  'Supervisor de Operações': '📈',
}

export default async function SegmentoPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { empresa?: string }
}) {
  const slug = decodeURIComponent(params.slug).toLowerCase()
  const segmento = SEGMENTOS[slug]
  if (!segmento) return notFound()

  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome_fantasia')
    .eq('dono_id', user.id)

  const { data: perfis } = await supabase
    .from('perfis_disc')
    .select('id, funcao')
    .in('funcao', segmento.funcoes)

  // mantém a ordem definida acima (não a ordem alfabética que vem do banco)
  const perfisOrdenados = segmento.funcoes
    .map((f) => perfis?.find((p) => p.funcao === f))
    .filter((p): p is { id: string; funcao: string } => !!p)

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/vagas" />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className={`bg-gradient-to-br ${segmento.cor} text-white rounded-2xl p-6 mb-6 flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex items-center gap-4">
            <div className="text-4xl">{segmento.emoji}</div>
            <div>
              <h1 className="text-xl font-semibold">{segmento.nome}</h1>
              <p className="text-sm opacity-90">
                Escolha a função e gere o link de avaliação
              </p>
            </div>
          </div>
          {empresas && empresas.length === 1 && (
            <span className="text-sm font-medium bg-white/15 rounded-lg px-3 py-1.5">
              {empresas[0].nome_fantasia}
            </span>
          )}
        </div>

        {(!empresas || empresas.length === 0) && (
          <p className="text-sm text-gray-500">
            Você ainda não tem uma empresa cadastrada.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perfisOrdenados.map((perfil) => (
            <GerarLinkCard
              key={perfil.id}
              perfilId={perfil.id}
              funcao={perfil.funcao}
              icone={ICONES_FUNCAO[perfil.funcao] ?? '💼'}
              empresas={empresas ?? []}
              empresaIdPadrao={empresas?.[0]?.id ?? ''}
            />
          ))}
          {perfisOrdenados.length === 0 && (
            <p className="text-sm text-gray-400 col-span-full text-center py-10">
              Nenhuma função cadastrada pra este segmento ainda.
            </p>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
