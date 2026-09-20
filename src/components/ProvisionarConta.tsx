'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

// Quando a confirmação de e-mail está ativa, a empresa não é criada na hora
// do cadastro (ainda não existe sessão pra isso). Esse componente roda em
// toda a aplicação e, assim que percebe um usuário logado sem nenhuma
// empresa, finaliza o cadastro sozinho usando os dados que ficaram
// guardados no metadata da conta (nome da empresa, segmento e CNPJ).
export default function ProvisionarConta() {
  const router = useRouter()

  useEffect(() => {
    async function provisionar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: empresas } = await supabase.from('minhas_empresas').select('id').limit(1)
      if (empresas && empresas.length > 0) return // já tem conta, nada a fazer

      // Primeiro tenta como convite de equipe
      const { data: entrouComoConvidado } = await supabase.rpc('vincular_convite_equipe', {
        p_uid: user.id,
        p_email: user.email,
      })
      if (entrouComoConvidado) {
        router.refresh()
        return
      }

      // Senão, usa os dados pendentes salvos no cadastro
      const meta = user.user_metadata as Record<string, string> | undefined
      if (!meta?.empresa_pendente) return

      await supabase.from('empresas').insert({
        dono_id: user.id,
        nome_fantasia: meta.empresa_pendente,
        segmento_principal: meta.segmento_pendente ?? 'Restaurante',
        cnpj: meta.cnpj_pendente ?? null,
      })

      router.refresh()
    }

    provisionar()
  }, [router])

  return null
}
