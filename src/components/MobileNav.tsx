'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoMarca from './LogoMarca'
import NovaEmpresaButton from './NovaEmpresaButton'
import { createClient } from '@/lib/supabaseClient'

const ITENS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/vagas', label: 'Vagas', icon: '💼' },
  { href: '/candidatos', label: 'Candidatos', icon: '👥' },
  { href: '/colaboradores', label: 'Colaboradores', icon: '🪪' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/planos', label: 'Planos', icon: '⭐', apenasAdmin: true },
  { href: '/equipe', label: 'Novo usuário', icon: '🧑‍💼', apenasAdmin: true },
  { href: '/empresas', label: 'Empresas cadastradas', icon: '🏢', apenasAdmin: true },
]

export default function MobileNav() {
  const [aberto, setAberto] = useState(false)
  const [admin, setAdmin] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Só o administrador (quem paga o plano) vê Planos, Novo usuário e Empresas cadastradas.
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('assinaturas').select('dono_id').eq('dono_id', user.id).maybeSingle()
      setAdmin(!!data)
    }
    carregar()
  }, [])

  const itens = ITENS.filter((item) => !item.apenasAdmin || admin)

  return (
    <>
      {/* Botão flutuante que abre o menu — só aparece no celular */}
      <button
        onClick={() => setAberto(true)}
        className="md:hidden fixed top-3 left-3 z-30 flex items-center gap-2 bg-[#0f172a] text-white text-xs font-medium pl-2 pr-3 py-2 rounded-full shadow-lg"
      >
        <span className="text-base">☰</span> Menu
      </button>

      {aberto && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative w-64 max-w-[80%] h-full bg-gradient-to-b from-slate-700 via-teal-600 to-lime-400 text-white flex flex-col p-4 gap-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <LogoMarca altura={18} />
              <button
                onClick={() => setAberto(false)}
                className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] uppercase tracking-wider text-white/70 font-semibold mb-1 px-1">Menu</p>

            {itens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition ${
                  pathname === item.href ? 'bg-white/20 font-medium' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {admin && (
              <div className="mt-2 border-t border-white/15 pt-2">
                <NovaEmpresaButton />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
