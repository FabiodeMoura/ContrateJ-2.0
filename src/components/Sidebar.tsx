import Link from 'next/link'
import NovaEmpresaButton from './NovaEmpresaButton'
import { MARCA, fraseDoDia } from '@/lib/frases'
import LogoMarca from './LogoMarca'

const ITENS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', cor: 'from-white/25 to-white/10' },
  { href: '/vagas', label: 'Vagas', icon: '💼', cor: 'from-white/25 to-white/10' },
  { href: '/candidatos', label: 'Candidatos', icon: '👥', cor: 'from-white/25 to-white/10' },
  { href: '/colaboradores', label: 'Colaboradores', icon: '🪪', cor: 'from-white/25 to-white/10' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈', cor: 'from-white/25 to-white/10' },
  { href: '/planos', label: 'Planos', icon: '⭐', cor: 'from-white/25 to-white/10' },
]

export default function Sidebar({ ativo }: { ativo: string }) {
  return (
    <aside
      className="hidden md:flex md:w-56 bg-gradient-to-b from-slate-700 via-teal-600 to-lime-400 text-white overflow-y-auto z-10"
      style={{ position: 'fixed', top: 0, left: 0, bottom: 0, height: '100vh', flexDirection: 'column' }}
    >
      <div className="p-4 pb-0 flex flex-col gap-1" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm">
            💼
          </div>
          <span className="font-semibold text-sm"><LogoMarca /></span>
        </div>
        <p className="text-[11px] text-white/80 px-1 mb-5 leading-tight">
          {MARCA.tagline}
        </p>

        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition ${
              ativo === item.href ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.cor} flex items-center justify-center text-sm shrink-0 ${
              ativo === item.href ? 'shadow-md' : ''
            }`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
        <NovaEmpresaButton />
      </div>

      {/* painel decorativo — mesma paleta amarelo/laranja do resto do menu, sem "banner" separado */}
      <div
        className="mt-4 relative overflow-hidden p-5 flex flex-col justify-between"
        style={{ flex: '1 1 auto', minHeight: '14rem' }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute bottom-20 -left-8 w-28 h-28 rounded-full bg-black/5" />
        <div className="relative grid grid-cols-3 gap-3 w-fit">
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">✅</span>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">👥</span>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">🎯</span>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">🤝</span>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">📋</span>
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">💬</span>
        </div>
        <div className="relative">
          <p className="text-[10px] uppercase tracking-wider text-white/80 font-semibold mb-1.5">Frase do dia</p>
          <p className="text-lg text-white font-bold leading-snug drop-shadow-sm">
            "{fraseDoDia()}"
          </p>
        </div>
      </div>
    </aside>
  )
}
