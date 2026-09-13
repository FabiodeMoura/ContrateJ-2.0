'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function RecalcularButton({ candidatoId }: { candidatoId: string }) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function recalcular() {
    setCarregando(true)
    setErro(null)

    const { error } = await supabase.rpc('calcular_aderencia', { p_candidato_id: candidatoId })

    setCarregando(false)

    if (error) {
      setErro('Ainda não foi possível calcular. Se o problema continuar, fale com o suporte.')
      return
    }

    router.refresh()
  }

  return (
    <div>
      <button
        onClick={recalcular}
        disabled={carregando}
        className="bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {carregando ? 'Calculando...' : 'Tentar calcular novamente'}
      </button>
      {erro && <p className="text-red-600 text-xs mt-2">{erro}</p>}
    </div>
  )
}
