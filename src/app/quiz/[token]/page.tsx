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

  // Ordem embaralhada das 4 alternativas de cada pergunta, sorteada e guardada no
  // banco (não no navegador) para não dar pra ver nem alterar, e pra não mudar se
  // a página for recarregada. Ver função obter_ordem_quiz no banco.
  const { data: ordens } = await supabase.rpc('obter_ordem_quiz', { p_candidato_id: candidatoId })
  const ordemPorPergunta = new Map<string, string[]>((ordens ?? []).map((o: any) => [o.pergunta_id, o.ordem]))

  const perguntasComOrdem = (perguntas ?? []).map((p) => {
    const textoPorLetra: Record<string, string> = { D: p.opcao_d, I: p.opcao_i, S: p.opcao_s, C: p.opcao_c }
    // Se por algum motivo a ordem não veio do banco, mantém a sequência padrão D, I, S, C
    const ordem = ordemPorPergunta.get(p.id) ?? ['D', 'I', 'S', 'C']
    return {
      id: p.id,
      texto_pergunta: p.texto_pergunta,
      alternativas: ordem.map((letra) => ({ letra: letra as 'D' | 'I' | 'S' | 'C', texto: textoPorLetra[letra] })),
    }
  })

  return (
    <QuizClient
      token={params.token}
      candidatoId={candidatoId}
      funcao={vaga.funcao}
      nomeEmpresa={vaga.empresa_nome ?? ''}
      perguntas={perguntasComOrdem}
    />
  )
}
