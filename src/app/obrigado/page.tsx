import Link from 'next/link'
import LogoMarca from '@/components/LogoMarca'

// Página de obrigado: para onde a Hotmart manda o cliente logo depois do pagamento.
// Pública (não exige login). Endereço para colar na Hotmart: https://contrateja.app.br/obrigado

export const metadata = {
  title: 'Pagamento confirmado · ContrateJá',
}

const PASSOS = [
  { n: '1', titulo: 'Crie sua conta', texto: 'Use o mesmo e-mail da compra e cadastre sua empresa.' },
  { n: '2', titulo: 'Gere o link da vaga', texto: 'No Dashboard, escolha o segmento e a função.' },
  { n: '3', titulo: 'Envie pelo WhatsApp', texto: 'O candidato responde pelo celular, sem baixar nada.' },
  { n: '4', titulo: 'Veja a aderência', texto: 'Em Candidatos, quem tiver Ótima aderência já ganha o convite de entrevista por vídeo.' },
  { n: '5', titulo: 'Contrate e acompanhe', texto: 'Cadastre em Colaboradores e acompanhe tudo em Relatórios.' },
]

export default function ObrigadoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-700 via-teal-600 to-lime-400 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-6">
          <LogoMarca altura={34} />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Topo */}
          <div className="px-6 md:px-10 pt-8 pb-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-lime-100 flex items-center justify-center text-3xl mb-4">🎉</div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
              Pagamento confirmado!
              <span className="block text-teal-600">Bem-vindo ao ContrateJá</span>
            </h1>
            <p className="text-sm text-gray-500 mt-3 max-w-md mx-auto">
              Seu plano já está sendo liberado. Agora falta só um passo para começar a contratar certo desde a primeira entrevista.
            </p>
          </div>

          {/* Aviso do e-mail */}
          <div className="mx-6 md:mx-10 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 flex gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-amber-900 text-sm">Importante: use o mesmo e-mail da compra</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                O sistema reconhece o seu plano pelo e-mail usado na Hotmart. Se criar a conta com outro e-mail,
                o plano não aparece. Já tem conta com esse e-mail? É só entrar normalmente.
              </p>
            </div>
          </div>

          {/* Botões principais */}
          <div className="px-6 md:px-10 pt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login?modo=cadastrar"
              className="flex-1 text-center bg-gradient-to-r from-slate-700 to-teal-600 text-white font-semibold rounded-xl px-5 py-3.5 shadow-lg hover:opacity-95 transition"
            >
              Criar minha conta agora →
            </Link>
            <Link
              href="/login"
              className="sm:w-40 text-center border border-gray-200 text-slate-700 font-medium rounded-xl px-5 py-3.5 hover:bg-gray-50 transition"
            >
              Já tenho conta
            </Link>
          </div>

          {/* Primeiros passos */}
          <div className="px-6 md:px-10 pt-8">
            <p className="text-xs font-bold tracking-wider text-teal-600 uppercase mb-3">Seu primeiro dia, em 5 passos</p>
            <ol className="space-y-3">
              {PASSOS.map((p) => (
                <li key={p.n} className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {p.n}
                  </span>
                  <p className="text-sm text-gray-600 leading-snug pt-0.5">
                    <span className="font-semibold text-slate-800">{p.titulo}.</span> {p.texto}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Manual */}
          <div className="mx-6 md:mx-10 mt-8 rounded-2xl bg-gradient-to-r from-teal-50 to-lime-50 border border-teal-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-4xl">📘</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">Manual do Usuário</p>
              <p className="text-xs text-gray-500 mt-0.5">O passo a passo completo, da primeira vaga à entrevista por vídeo.</p>
            </div>
            <a
              href="/manual-contrateja.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center bg-white border border-teal-200 text-teal-700 font-semibold text-sm rounded-xl px-4 py-2.5 hover:bg-teal-50 transition"
            >
              Baixar o manual (PDF)
            </a>
          </div>

          {/* Rodapé */}
          <div className="px-6 md:px-10 py-6 mt-6 border-t text-center space-y-1">
            <p className="text-xs text-gray-500">
              Precisa de ajuda?{' '}
              <a href="mailto:suporte@contrateja.app.br" className="font-medium text-teal-700 hover:underline">
                suporte@contrateja.app.br
              </a>
            </p>
            <p className="text-[11px] text-gray-400">
              O acesso à área de membros e o recibo também chegam no seu e-mail pela Hotmart.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/80 mt-5">Desenvolvido por Fábio de Moura</p>
      </div>
    </main>
  )
}
