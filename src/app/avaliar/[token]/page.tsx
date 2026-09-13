import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import FormularioCandidato from './FormularioCandidato'

// Página pública — não exige login. Acessada pelo link enviado no WhatsApp.
export default async function AvaliarPage({ params }: { params: { token: string } }) {
  const supabase = createServerSupabase()

  const { data: vaga } = await supabase
    .from('vagas')
    .select('id, funcao, link_usado, empresas ( nome_fantasia, logo_url )')
    .eq('token_link', params.token)
    .single()

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
      // @ts-expect-error - relação aninhada do Supabase
      nomeEmpresa={vaga.empresas?.nome_fantasia ?? ''}
      token={params.token}
    />
  )
}
