import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import PesquisaSaidaClient from './PesquisaSaidaClient'

export default async function SaidaPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()

  const { data: colaborador } = await supabase
    .from('colaboradores')
    .select('id, nome_completo, empresas ( nome_fantasia )')
    .eq('id', params.id)
    .single()

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
      // @ts-expect-error - relação aninhada
      nomeEmpresa={colaborador.empresas?.nome_fantasia ?? ''}
      jaRespondeu={(jaRespondeu?.length ?? 0) > 0}
    />
  )
}
