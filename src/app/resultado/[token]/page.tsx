import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import RecalcularButton from './RecalcularButton'
import BannerCandidato from '@/components/BannerCandidato'

// Nota: aqui o [token] da URL corresponde ao ID do candidato
export default async function ResultadoPage({ params }: { params: { token: string } }) {
  const supabase = createServerSupabase()

  const { data: candidato } = await supabase
    .from('candidatos')
    .select('nome_completo, percentual_aderencia, vagas ( funcao, empresas ( nome_fantasia ) )')
    .eq('id', params.token)
    .single()

  if (!candidato) return notFound()

  const semResultado = candidato.percentual_aderencia === null || candidato.percentual_aderencia === undefined

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden text-center">
        <BannerCandidato />
        <div className="p-6">
        <p className="text-xs text-gray-500 mb-6">Avaliação concluída</p>

        {semResultado ? (
          <div className="mb-5">
            <div className="w-36 h-36 rounded-full border-4 border-amber-200 bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <p className="text-3xl">⏳</p>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Suas respostas foram salvas, mas o resultado ainda não foi calculado.
            </p>
            <RecalcularButton candidatoId={params.token} />
          </div>
        ) : (
          <div className="w-36 h-36 rounded-full border-4 border-indigo-100 bg-indigo-50 flex items-center justify-center mx-auto mb-5">
            <div>
              <p className="text-3xl font-semibold text-indigo-700">
                {candidato.percentual_aderencia}%
              </p>
              <p className="text-[11px] text-indigo-700">aderência</p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mb-5">
          Obrigado por participar! O resultado completo será analisado pela equipe de recrutamento.
        </p>

        <div className="border-t pt-4 text-left text-sm">
          <p className="text-xs text-gray-500">Vaga</p>
          {/* @ts-expect-error - relação aninhada */}
          <p className="font-medium mb-2">{candidato.vagas?.funcao} — {candidato.vagas?.empresas?.nome_fantasia}</p>
          <p className="text-xs text-gray-500">Candidato</p>
          <p className="font-medium">{candidato.nome_completo}</p>
        </div>
        </div>
      </div>
    </div>
  )
}
