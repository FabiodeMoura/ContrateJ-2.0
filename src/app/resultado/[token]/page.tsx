import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import RecalcularButton from './RecalcularButton'

// Nota: aqui o [token] da URL corresponde ao ID do candidato
export default async function ResultadoPage({ params }: { params: { token: string } }) {
  const supabase = createServerSupabase()

  const { data: candidato } = await supabase
    .from('candidatos')
    .select('nome_completo, percentual_aderencia, recomendacao, vagas ( funcao, empresas ( nome_fantasia ) )')
    .eq('id', params.token)
    .single()

  if (!candidato) return notFound()

  const semResultado = candidato.percentual_aderencia === null || candidato.percentual_aderencia === undefined

  const cor =
    candidato.recomendacao === 'Recomendado'
      ? 'text-green-600 bg-green-50'
      : candidato.recomendacao === 'Avaliar'
      ? 'text-amber-600 bg-amber-50'
      : 'text-red-600 bg-red-50'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 text-center">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 mx-auto mb-4 flex items-center justify-center text-white">
          💼
        </div>
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
          <>
            <div className="w-36 h-36 rounded-full border-4 border-green-200 bg-green-50 flex items-center justify-center mx-auto mb-5">
              <div>
                <p className="text-3xl font-semibold text-green-700">
                  {candidato.percentual_aderencia}%
                </p>
                <p className="text-[11px] text-green-700">aderência</p>
              </div>
            </div>

            <span className={`inline-block text-xs font-medium px-3 py-1.5 rounded-full mb-5 ${cor}`}>
              {candidato.recomendacao}
            </span>
          </>
        )}

        <div className="border-t pt-4 text-left text-sm">
          <p className="text-xs text-gray-500">Vaga</p>
          {/* @ts-expect-error - relação aninhada */}
          <p className="font-medium mb-2">{candidato.vagas?.funcao} — {candidato.vagas?.empresas?.nome_fantasia}</p>
          <p className="text-xs text-gray-500">Candidato</p>
          <p className="font-medium">{candidato.nome_completo}</p>
        </div>
      </div>
    </div>
  )
}
