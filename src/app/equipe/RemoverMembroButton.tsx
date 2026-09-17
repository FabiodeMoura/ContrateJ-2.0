'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function RemoverMembroButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function remover() {
    if (!confirm('Remover o acesso desse usuário à sua conta?')) return
    await supabase.from('equipe').delete().eq('id', id)
    router.refresh()
  }

  return (
    <button onClick={remover} className="text-gray-400 hover:text-red-600 text-xs">
      ✕
    </button>
  )
}
