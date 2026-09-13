'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITENS = [
  { href: '/dashboard', label: 'Início', icon: '📊' },
  { href: '/vagas', label: 'Vagas', icon: '💼' },
  { href: '/candidatos', label: 'Candidatos', icon: '👥' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-10">
      {ITENS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center gap-0.5 text-[10px] px-2 ${
            pathname === item.href ? 'text-indigo-600 font-medium' : 'text-gray-400'
          }`}
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
