import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import ComprarLinksExtrasButton from './ComprarLinksExtrasButton'

const PLANOS = [
  {
    nome: 'Gratuito',
    preco: 'R$ 0',
    periodo: '',
    limite: 20,
    destaque: false,
    beneficios: ['20 links de avaliação', 'Todas as funções e segmentos', 'Painel completo de indicadores'],
    linkHotmart: null,
  },
  {
    nome: 'Plano 79',
    preco: 'R$ 79,90',
    periodo: '/mês',
    limite: 50,
    destaque: true,
    beneficios: ['50 links de avaliação por mês', 'Libera o cadastro de +1 empresa', 'Tudo do plano gratuito', 'Suporte prioritário'],
    // Troque pelo link de checkout real do produto no Hotmart
    linkHotmart: 'https://pay.hotmart.com/SEU-PRODUTO-79',
  },
  {
    nome: 'Plano 99',
    preco: 'R$ 99,90',
    periodo: '/mês',
    limite: 80,
    destaque: false,
    beneficios: ['80 links de avaliação por mês', 'Libera o cadastro de +1 empresa', 'Tudo do plano anterior', 'Suporte prioritário'],
    // Troque pelo link de checkout real do produto no Hotmart
    linkHotmart: 'https://pay.hotmart.com/SEU-PRODUTO-99',
  },
]

export default async function PlanosPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano, limite_links, links_usados, links_extras')
    .eq('dono_id', user.id)
    .single()

  const limiteTotal = (assinatura?.limite_links ?? 20) + (assinatura?.links_extras ?? 0)
  const usados = assinatura?.links_usados ?? 0
  const percentual = limiteTotal > 0 ? Math.min(100, Math.round((usados / limiteTotal) * 100)) : 0

  return (
    <div className="flex min-h-screen bg-gray-50 md:pl-56">
      <Sidebar ativo="/planos" />
      <main className="flex-1 pt-16 md:pt-8 p-4 md:p-8 pb-8">
        <h1 className="text-lg font-semibold mb-1">Planos</h1>
        <p className="text-xs text-gray-500 mb-6">Escolha o plano ideal pro tamanho do seu processo seletivo</p>

        <div className="bg-white rounded-2xl border p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              Seu plano atual: <span className="text-indigo-600">{assinatura?.plano ?? 'Gratuito'}</span>
            </p>
            <p className="text-sm text-gray-500">{usados} / {limiteTotal} links usados</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${percentual >= 100 ? 'bg-red-500' : percentual >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
              style={{ width: `${percentual}%` }}
            />
          </div>
          {assinatura?.links_extras ? (
            <p className="text-xs text-gray-400 mt-2">Inclui {assinatura.links_extras} link(s) extra(s) comprado(s)</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {PLANOS.map((plano) => (
            <div
              key={plano.nome}
              className={`rounded-2xl border p-6 flex flex-col ${
                plano.destaque ? 'border-teal-500 shadow-lg ring-2 ring-lime-200' : ''
              } ${assinatura?.plano === plano.nome ? 'bg-lime-50/50' : 'bg-white'}`}
            >
              {plano.destaque && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-lime-100 rounded-full px-2 py-1 w-fit mb-3">
                  Mais popular
                </span>
              )}
              <p className="text-lg font-semibold mb-1">{plano.nome === 'Gratuito' ? 'Gratuito' : plano.nome.replace('Plano ', 'Plano R$ ')}</p>
              <p className="text-3xl font-bold mb-1">
                {plano.preco}<span className="text-sm font-normal text-gray-400">{plano.periodo}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">{plano.limite} links gerados</p>
              <ul className="space-y-2 mb-6 flex-1">
                {plano.beneficios.map((b) => (
                  <li key={b} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-600">✓</span> {b}
                  </li>
                ))}
              </ul>
              {assinatura?.plano === plano.nome ? (
                <span className="text-center text-sm font-medium text-gray-400 border rounded-lg py-2">
                  Plano atual
                </span>
              ) : plano.linkHotmart ? (
                <a
                  href={plano.linkHotmart}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 transition"
                >
                  Assinar agora
                </a>
              ) : (
                <span className="text-center text-sm font-medium text-gray-400 border rounded-lg py-2">
                  Plano inicial
                </span>
              )}
            </div>
          ))}
        </div>

        {assinatura?.plano !== 'Gratuito' ? (
          <div className="bg-white rounded-2xl border p-6">
            <p className="font-medium text-sm mb-1">Precisa de mais alguns links?</p>
            <p className="text-xs text-gray-500 mb-4">
              Compre links avulsos por R$ 2,00 cada, sem precisar mudar de plano.
            </p>
            <ComprarLinksExtrasButton />
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl border border-dashed p-6 text-center">
            <p className="text-sm text-gray-500">
              🔒 Links avulsos ficam disponíveis a partir do <strong>Plano 79</strong> ou <strong>Plano 99</strong>.
              Assine um deles pra desbloquear essa opção.
            </p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
