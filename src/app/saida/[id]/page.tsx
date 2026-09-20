import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import PesquisaSaidaClient from './PesquisaSaidaClient'

export default async function SaidaPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()

  const { data: colaboradores } = await supabase.rpc('colaborador_publico', { p_id: params.id })
  const colaborador = colaboradores?.[0]

  if (!colaborador) return notFound()

  const { data: jaRespondeu } = await supabase
    .from('respostas_saida')
    .select('id')
    .eq('colaborador_id', params.id)
    .limit(1)

  return (
    <PesquisaSaidaClient
      colaboradorId={params.id}
      nomeColaborador={colaborador.nome_completo}
      nomeEmpresa={colaborador.empresa_nome ?? ''}
      jaRespondeu={(jaRespondeu?.length ?? 0) > 0}
    />
  )
}
