import Link from 'next/link'
import NovaEmpresaButton from './NovaEmpresaButton'

const ITENS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/vagas', label: 'Vagas', icon: '💼' },
  { href: '/candidatos', label: 'Candidatos', icon: '👥' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
]

export default function Sidebar({ ativo }: { ativo: string }) {
  return (
    <aside className="hidden md:flex md:w-56 bg-[#14161a] text-white flex-col p-4 gap-1 shrink-0">
      <div className="flex items-center gap-2 mb-1 px-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
          💼
        </div>
        <span className="font-semibold text-sm">ContrateJá</span>
      </div>
      <p className="text-[11px] text-gray-400 px-1 mb-5 leading-tight">
        Talentos que fazem a diferença no seu negócio
      </p>

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
      <NovaEmpresaButton />

      {/* painel decorativo — pessoas/recrutamento, sem imagens de comida */}
      <div className="mt-auto relative rounded-xl overflow-hidden h-40">
        <img
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=400&q=60"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <p className="absolute bottom-3 left-3 right-3 text-xs text-white/90 italic leading-snug">
          "Grandes resultados começam com boas contratações."
        </p>
      </div>
    </aside>
  )
}
