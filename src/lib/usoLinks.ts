import { SupabaseClient } from '@supabase/supabase-js'

export interface ResultadoUso {
  permitido: boolean
  links_usados: number
  limite_total: number
}

// Verifica se o gestor ainda pode gerar mais um link (dentro do plano +
// links extras comprados) e, se puder, já soma 1 ao contador de uso —
// tudo em uma função só do banco, pra evitar corrida entre cliques.
export async function verificarEIncrementarUso(
  supabase: SupabaseClient,
  donoId: string
): Promise<ResultadoUso | null> {
  const { data, error } = await supabase.rpc('incrementar_uso_link', { p_dono_id: donoId })
  if (error || !data || data.length === 0) return null
  return data[0] as ResultadoUso
}
