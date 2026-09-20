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

  const { data: vagas } = await supabase.rpc('vaga_publica', { p_token: params.token })
  const vaga = vagas?.[0]

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
      nomeEmpresa={vaga.empresa_nome ?? ''}
      perguntas={perguntas ?? []}
    />
  )
}
