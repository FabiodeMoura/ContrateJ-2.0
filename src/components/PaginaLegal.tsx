import Link from 'next/link'

// Moldura simples das páginas de Termos de Uso e Política de Privacidade.
export default function PaginaLegal({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-800 to-teal-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="" className="w-8 h-8 rounded-lg object-contain" />
            <img src="/logo-wordmark.png" alt="ContrateJá" className="h-5 w-auto" />
          </Link>
          <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white">Entrar</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900">{titulo}</h1>
        <p className="text-sm text-slate-500 mt-1">Última atualização: {atualizado}</p>
        <div className="mt-8 space-y-6 text-slate-700 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-teal-700 [&_a]:underline">
          {children}
        </div>
        <p className="mt-12 text-sm text-slate-500">
          Dúvidas: <a href="mailto:suporte@contrateja.app.br" className="text-teal-700 underline">suporte@contrateja.app.br</a> ·{' '}
          <Link href="/termos" className="underline">Termos de Uso</Link> · <Link href="/privacidade" className="underline">Política de Privacidade</Link>
        </p>
      </main>
    </div>
  )
}
