import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import QuizClient from './QuizClient'

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { candidato?: string }
}) {
  const supabase = createServerSupabase()
  const candidatoId = searchParams.candidato

  if (!candidatoId) return notFound()

  const { data: vaga } = await supabase
    .from('vagas')
    .select('id, funcao, perfil_disc_id, empresas ( nome_fantasia )')
    .eq('token_link', params.token)
    .single()

  if (!vaga) return notFound()

  const { data: perguntas } = await supabase
    .from('perguntas_disc')
    .select('id, ordem, texto_pergunta, opcao_d, opcao_i, opcao_s, opcao_c')
    .eq('perfil_disc_id', vaga.perfil_disc_id)
    .order('ordem', { ascending: true })

  return (
    <QuizClient
      token={params.token}
      candidatoId={candidatoId}
      funcao={vaga.funcao}
      // @ts-expect-error - relação aninhada do Supabase
      nomeEmpresa={vaga.empresas?.nome_fantasia ?? ''}
      perguntas={perguntas ?? []}
    />
  )
}
