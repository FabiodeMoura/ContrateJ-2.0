import Link from 'next/link'
import NovaEmpresaButton from './NovaEmpresaButton'
import { MARCA, fraseDoDia } from '@/lib/frases'

const ITENS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', cor: 'from-indigo-500 to-indigo-600' },
  { href: '/vagas', label: 'Vagas', icon: '💼', cor: 'from-blue-500 to-blue-600' },
  { href: '/candidatos', label: 'Candidatos', icon: '👥', cor: 'from-green-500 to-green-600' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈', cor: 'from-purple-500 to-purple-600' },
]

export default function Sidebar({ ativo }: { ativo: string }) {
  return (
    <aside className="hidden md:flex md:w-56 bg-[#14161a] text-white flex-col p-4 gap-1 shrink-0">
      <div className="flex items-center gap-2 mb-1 px-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
          💼
        </div>
        <span className="font-semibold text-sm">{MARCA.nome}</span>
      </div>
      <p className="text-[11px] text-gray-400 px-1 mb-5 leading-tight">
        {MARCA.tagline}
      </p>

      {ITENS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition ${
            ativo === item.href ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
          }`}
        >
          <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.cor} flex items-center justify-center text-sm shrink-0 ${
            ativo === item.href ? 'shadow-md' : 'opacity-90'
          }`}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
      <NovaEmpresaButton />

      {/* painel decorativo — gradiente vivo com ícones, sem foto real */}
      <div className="mt-auto relative rounded-xl overflow-hidden min-h-[12rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-4 flex flex-col justify-between">
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute bottom-8 -left-6 w-16 h-16 rounded-full bg-white/10" />
        <div className="relative flex gap-2">
          <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm">✅</span>
          <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm">👥</span>
          <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm">🎯</span>
        </div>
        <div className="relative">
          <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold mb-1">Frase do dia</p>
          <p className="text-base text-white font-bold leading-snug">
            "{fraseDoDia()}"
          </p>
        </div>
      </div>
    </aside>
  )
}
