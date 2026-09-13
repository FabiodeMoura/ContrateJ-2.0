'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={sair}
      className="text-xs font-medium text-gray-500 border rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition"
    >
      Sair
    </button>
  )
}
