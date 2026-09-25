import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import PaginaVendas from './PaginaVendas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ContrateJá · Contrate certo desde a primeira entrevista',
  description:
    'Avaliação comportamental para contratar em restaurantes, bares, lanchonetes, padarias, pizzarias e sacolões. Envie um link pelo WhatsApp e veja a aderência na hora. Comece grátis.',
  openGraph: {
    title: 'ContrateJá · Contrate certo desde a primeira entrevista',
    description: 'Envie um link pelo WhatsApp, o candidato responde pelo celular e você vê na hora o quanto ele combina com a vaga. Comece grátis com 20 links.',
    url: 'https://contrateja.app.br',
    siteName: 'ContrateJá',
    images: [{ url: '/video/capa-video.jpg', width: 1280, height: 720 }],
    locale: 'pt_BR',
    type: 'website',
  },
}

// Quem já está logado vai direto para o painel; quem chega de fora (Instagram, anúncio) vê a página de vendas.
export default async function HomePage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  return <PaginaVendas />
}
