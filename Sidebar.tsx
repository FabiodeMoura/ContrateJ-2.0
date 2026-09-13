import Link from 'next/link'

const ITENS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/vagas', label: 'Vagas', icon: '💼' },
  { href: '/candidatos', label: 'Candidatos', icon: '👥' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
]

export default function Sidebar({ ativo }: { ativo: string }) {
  return (
    <aside className="hidden md:flex md:w-52 bg-[#14161a] text-white flex-col p-4 gap-1 shrink-0">
      <div className="flex items-center gap-2 mb-6 px-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
          💼
        </div>
        <span className="font-semibold text-sm">ContrateJá</span>
      </div>
      {ITENS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
            ativo === item.href ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/5'
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </aside>
  )
}
