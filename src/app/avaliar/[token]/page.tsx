import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import FormularioCandidato from './FormularioCandidato'

// Página pública — não exige login. Acessada pelo link enviado no WhatsApp.
export default async function AvaliarPage({ params }: { params: { token: string } }) {
  const supabase = createServerSupabase()

  // Busca só a vaga do link recebido (função do banco, sem ler a tabela inteira)
  const { data: vagas } = await supabase.rpc('vaga_publica', { p_token: params.token })
  const vaga = vagas?.[0]

  if (!vaga) return notFound()

  if (vaga.link_usado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Este link já foi utilizado</p>
          <p className="text-sm text-gray-500">
            Cada candidato pode responder a avaliação apenas uma vez. Entre em
            contato com a empresa caso precise de um novo link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <FormularioCandidato
      vagaId={vaga.id}
      funcao={vaga.funcao}
      nomeEmpresa={vaga.empresa_nome ?? ''}
      token={params.token}
    />
  )
}
