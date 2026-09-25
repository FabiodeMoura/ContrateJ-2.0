import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import EmpresaSelector from '@/components/EmpresaSelector'
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
      'Garçom', 'Copeiro', 'Cozinheiro', 'Auxiliar de Cozinha', 'Chapeiro', 'Gerente',
      'Subgerente', 'Supervisor de Operações', 'Caixa', 'Recepcionista',
      'Segurança', 'Motoboy/Entregador', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal',
    ],
  },
  bar: {
    nome: 'Bar',
    emoji: '🍸',
    cor: 'from-pink-400 to-pink-600',
    funcoes: ['Bartender', 'Garçom', 'Cozinheiro', 'Segurança', 'Caixa', 'Gerente', 'Subgerente', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal'],
  },
  lanchonete: {
    nome: 'Lanchonete',
    emoji: '🍔',
    cor: 'from-yellow-400 to-yellow-600',
    funcoes: ['Atendente', 'Cozinheiro', 'Chapeiro', 'Salgadeira', 'Salgadeiro', 'Caixa', 'Motoboy/Entregador', 'Gerente', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal'],
  },
  padaria: {
    nome: 'Padaria',
    emoji: '🍞',
    cor: 'from-sky-400 to-sky-600',
    funcoes: ['Padeiro', 'Confeiteiro', 'Salgadeira', 'Salgadeiro', 'Atendente', 'Caixa', 'Gerente', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal'],
  },
  'sacolão': {
    nome: 'Sacolão',
    emoji: '🥬',
    cor: 'from-green-400 to-green-600',
    funcoes: ['Atendente/Repositor', 'Repositor', 'Açougueiro', 'Caixa', 'Motorista', 'Gerente', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal'],
  },
  sacolao: {
    nome: 'Sacolão',
    emoji: '🥬',
    cor: 'from-green-400 to-green-600',
    funcoes: ['Atendente/Repositor', 'Repositor', 'Açougueiro', 'Caixa', 'Motorista', 'Gerente', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal'],
  },
  pizzaria: {
    nome: 'Pizzaria',
    emoji: '🍕',
    cor: 'from-red-400 to-red-600',
    funcoes: ['Pizzaiolo', 'Cozinheiro', 'Atendente', 'Motoboy/Entregador', 'Caixa', 'Gerente', 'Serviços Gerais', 'Financeiro', 'Analista Fiscal'],
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
  'Copeiro': '🥤',
  'Cozinheiro': '👨‍🍳',
  'Financeiro': '💰',
  'Garçom': '🍴',
  'Gerente': '👔',
  'Motoboy/Entregador': '🛵',
  'Motorista': '🚚',
  'Padeiro': '🥖',
  'Pizzaiolo': '🍕',
  'Recepcionista': '📋',
  'Salgadeira': '🥟',
  'Salgadeiro': '🥟',
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
    .from('minhas_empresas')
    .select('id, nome_fantasia')

  const { data: perfis } = await supabase
    .from('perfis_disc')
    .select('id, funcao')
    .in('funcao', segmento.funcoes)

  // Só vale uma empresa da própria conta; senão usa a primeira
  const empresaSelecionada =
    empresas?.find((e) => e.id === searchParams.empresa)?.id ?? empresas?.[0]?.id ?? ''

  // mantém a ordem definida acima (não a ordem alfabética que vem do banco)
  const perfisOrdenados = segmento.funcoes
    .map((f) => perfis?.find((p) => p.funcao === f))
    .filter((p): p is { id: string; funcao: string } => !!p)

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/vagas" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
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

        {empresas && empresas.length > 1 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">
              Gerando link para: <span className="font-medium text-gray-700">
                {empresas.find((e) => e.id === empresaSelecionada)?.nome_fantasia}
              </span>
            </p>
            <EmpresaSelector empresas={empresas} valorAtual={empresaSelecionada} />
          </div>
        )}

        {(!empresas || empresas.length === 0) && (
          <p className="text-sm text-gray-500">
            Você ainda não tem uma empresa cadastrada.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perfisOrdenados.map((perfil) => (
            <GerarLinkCard
              key={`${perfil.id}-${empresaSelecionada}`}
              perfilId={perfil.id}
              funcao={perfil.funcao}
              icone={ICONES_FUNCAO[perfil.funcao] ?? '💼'}
              empresas={empresas ?? []}
              empresaIdPadrao={empresaSelecionada}
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
