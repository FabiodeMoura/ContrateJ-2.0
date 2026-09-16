'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import {
  obterCandidatosPendentes,
  removerCandidatoPendente,
  obterRespostasPendentes,
  removerRespostasPendente,
  temPendencias,
} from '@/lib/filaOffline'

export default function SincronizarFila() {
  useEffect(() => {
    async function sincronizar() {
      if (typeof navigator === 'undefined' || !navigator.onLine) return
      if (!temPendencias()) return

      const supabase = createClient()

      // 1. Primeiro os cadastros de candidato (respostas dependem deles existirem)
      for (const candidato of obterCandidatosPendentes()) {
        const { error } = await supabase.from('candidatos').insert(candidato)
        if (!error || error.code === '23505') {
          // sucesso, ou já existia (envio duplicado) — remove da fila dos dois jeitos
          removerCandidatoPendente(candidato.id)
        }
      }

      // 2. Depois as respostas + cálculo de aderência
      for (const item of obterRespostasPendentes()) {
        const { error: erroRespostas } = await supabase
          .from('respostas_candidato')
          .insert(item.respostas)

        if (!erroRespostas || erroRespostas.code === '23505') {
          await supabase.rpc('calcular_aderencia', { p_candidato_id: item.candidatoId })
          removerRespostasPendente(item.candidatoId)
        }
      }
    }

    sincronizar()
    window.addEventListener('online', sincronizar)
    return () => window.removeEventListener('online', sincronizar)
  }, [])

  return null
}
