import Link from 'next/link'

// Página de vendas do ContrateJá (contrateja.app.br para quem ainda não está logado).
// Todos os botões de ação levam ao cadastro gratuito: /login?modo=cadastrar

const CADASTRO = '/login?modo=cadastrar'

const PASSOS = [
  { n: '1', icone: '🔗', titulo: 'Gere o link da vaga', texto: 'Escolha o segmento e a função. O perfil ideal já vem pronto: é só gerar o link.' },
  { n: '2', icone: '📱', titulo: 'Envie pelo WhatsApp', texto: 'O candidato responde pelo celular em poucos minutos, sem login e sem baixar nada.' },
  { n: '3', icone: '🎯', titulo: 'Veja a aderência na hora', texto: 'O sistema mostra o quanto cada candidato combina com a vaga. Gostou? Marque a entrevista em um clique.' },
]

const RECURSOS = [
  { icone: '🎯', titulo: 'Perfil ideal por função', texto: 'Avaliação comportamental (DISC) com o perfil ideal de cada função já traçado.' },
  { icone: '🎥', titulo: 'Entrevista por vídeo em 1 clique', texto: 'A sala é criada na hora e o convite vai pelo WhatsApp. Sem Zoom, sem Google Meet.' },
  { icone: '✨', titulo: 'Currículo lido por IA', texto: 'Importe o currículo e a inteligência artificial preenche os dados do candidato.' },
  { icone: '📥', titulo: 'Fila de candidaturas', texto: 'Aprove, guarde ou descarte. O crédito só é usado quando você aprova.' },
  { icone: '📈', titulo: 'Turnover e pesquisa de saída', texto: 'Saiba por que as pessoas saem, com os motivos somados em percentual.' },
  { icone: '🏢', titulo: 'Várias lojas, uma conta', texto: 'Filtre tudo por unidade e cadastre usuários para cada loja.' },
]

const SEGMENTOS = [
  { e: '🍽️', n: 'Restaurante' }, { e: '🍸', n: 'Bar' }, { e: '🍔', n: 'Lanchonete' },
  { e: '🍞', n: 'Padaria' }, { e: '🍕', n: 'Pizzaria' }, { e: '🥬', n: 'Sacolão' },
]

const FUNCOES = ['Garçom', 'Copeiro', 'Cozinheiro', 'Auxiliar de Cozinha', 'Chapeiro', 'Pizzaiolo', 'Padeiro', 'Confeiteiro',
  'Salgadeiro(a)', 'Bartender', 'Atendente', 'Caixa', 'Repositor', 'Açougueiro', 'Motoboy', 'Gerente', 'e mais']

const PLANOS = [
  { nome: 'Gratuito', preco: 'R$ 0', sufixo: '', itens: ['20 links de avaliação', '1 empresa', 'Todas as funções e segmentos', 'Painel e relatórios'], cta: 'Começar grátis', destaque: false },
  { nome: 'Plano 79', preco: 'R$ 79,90', sufixo: '/mês', itens: ['50 links por mês', '+1 empresa e 2 usuários por empresa', 'Links avulsos quando precisar', 'Suporte prioritário'], cta: 'Começar e assinar depois', destaque: false },
  { nome: 'Plano 99', preco: 'R$ 99,90', sufixo: '/mês', itens: ['80 links por mês', '+1 empresa e 2 usuários por empresa', 'Links avulsos quando precisar', 'Suporte prioritário'], cta: 'Começar e assinar depois', destaque: true },
]

const DUVIDAS = [
  { p: 'O candidato precisa baixar algum aplicativo?', r: 'Não. Ele abre o link no celular ou no computador e responde direto no navegador, em poucos minutos.' },
  { p: 'Preciso de cartão para testar?', r: 'Não. Você cria a conta grátis, cadastra sua empresa e já tem 20 links de avaliação para usar.' },
  { p: 'O candidato consegue "acertar" as respostas?', r: 'Não existe resposta certa, e a ordem das alternativas é sorteada para cada pessoa. Decorar gabarito não funciona.' },
  { p: 'Preciso de Zoom ou Google Meet para entrevistar?', r: 'Não. Na tela de candidatos, o botão Gerar link cria a sala de vídeo e o botão Enviar manda o convite pelo WhatsApp.' },
  { p: 'Tenho várias lojas. Funciona para mim?', r: 'Sim. Vagas, candidatos, colaboradores e relatórios têm filtro por empresa, e cada usuário trabalha na loja que você escolher.' },
  { p: 'Como funciona o cancelamento?', r: 'A assinatura é mensal e pode ser cancelada quando quiser. O acesso continua até o fim do período já pago.' },
]

function Botao({ children, claro = false, grande = false }: { children: React.ReactNode; claro?: boolean; grande?: boolean }) {
  return (
    <Link
      href={CADASTRO}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition shadow-lg whitespace-nowrap ${
        grande ? 'px-7 py-4 text-lg' : 'px-5 py-3 text-base'
      } ${claro ? 'bg-lime-400 text-slate-900 hover:bg-lime-300' : 'bg-gradient-to-r from-slate-700 to-teal-600 text-white hover:opacity-95'}`}
    >
      {children}
    </Link>
  )
}

function TelaCandidatos() {
  const linhas = [
    { nome: 'Fabiana Rocha', ad: '92%', cor: 'text-teal-600', selo: '✓ Ótima aderência', estilo: 'bg-green-100 text-green-700' },
    { nome: 'Lucas Martins', ad: '84%', cor: 'text-teal-600', selo: '✓ Ótima aderência', estilo: 'bg-green-100 text-green-700' },
    { nome: 'Juliana Alves', ad: '71%', cor: 'text-amber-600', selo: '⚠ Atenção especial', estilo: 'bg-amber-100 text-amber-700' },
    { nome: 'Pedro Henrique', ad: '55%', cor: 'text-red-600', selo: '⛔ Não recomendado', estilo: 'bg-red-100 text-red-700' },
  ]
  return (
    <div className="relative">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900 text-left">
        <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 border-b">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-[11px] text-slate-500 bg-white rounded-full px-3 py-0.5 border">contrateja.app.br/candidatos</span>
        </div>
        <div className="p-4 sm:p-5 pb-8 sm:pb-6">
          <p className="font-bold text-base">Candidatos · Garçom</p>
          <p className="text-xs text-slate-500 mb-3">Unidade Centro · 4 avaliados</p>
          <div className="divide-y">
            {linhas.map((l) => (
              <div key={l.nome} className="flex items-center gap-3 py-2.5">
                <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">{l.nome[0]}</span>
                <span className="flex-1 text-sm font-semibold truncate">{l.nome}</span>
                <span className={`text-lg font-extrabold ${l.cor}`}>{l.ad}</span>
                <span className={`hidden sm:inline md:hidden lg:inline text-[11px] font-bold px-2.5 py-1 rounded-full ${l.estilo}`}>{l.selo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-9 left-3 sm:-left-8 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🎥</span>
        <div className="text-left">
          <p className="text-xs font-bold text-slate-900">Entrevista marcada</p>
          <p className="text-[11px] text-slate-500">Convite enviado pelo WhatsApp</p>
        </div>
      </div>
    </div>
  )
}

export default function PaginaVendas() {
  return (
    <div className="bg-white text-slate-900">
      {/* Topo */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="" className="w-8 h-8 rounded-lg object-contain" />
            <img src="/logo-wordmark.png" alt="ContrateJá" className="h-5 w-auto" />
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/85 font-medium">
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#duvidas" className="hover:text-white">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white px-3 py-2">Entrar</Link>
            <Link href={CADASTRO} className="hidden sm:inline-flex text-sm font-bold bg-lime-400 text-slate-900 rounded-xl px-4 py-2 hover:bg-lime-300">Teste grátis</Link>
          </div>
        </div>
      </header>

      {/* Abertura */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-teal-700 to-teal-500 text-white">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-lime-300/20" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-teal-300/20" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20 md:pt-36 md:pb-28 grid md:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-wider uppercase bg-white/15 rounded-full px-3 py-1.5 mb-5">
              Para restaurantes, bares, lanchonetes, padarias, pizzarias e sacolões
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold leading-[1.05] tracking-tight">
              Contrate certo desde a <span className="text-lime-300">primeira entrevista.</span>
            </h1>
            <p className="mt-5 text-lg text-teal-50/90 max-w-xl">
              Envie um link pelo WhatsApp, o candidato responde pelo celular e você vê na hora o quanto ele combina com a vaga.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Botao claro grande>Comece grátis com 20 links →</Botao>
              <a href="#video" className="inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-lg font-semibold border border-white/40 hover:bg-white/10 whitespace-nowrap">▶ Ver como funciona</a>
            </div>
            <p className="mt-4 text-sm text-teal-50/80">✓ Sem cartão de crédito &nbsp;·&nbsp; ✓ Pronto em 2 minutos &nbsp;·&nbsp; ✓ Funciona no celular</p>
          </div>
          <TelaCandidatos />
        </div>
      </section>

      {/* Problema */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">Contratar errado <span className="text-teal-600">custa caro.</span></h2>
        <p className="text-center text-slate-500 mt-3 max-w-2xl mx-auto">No food service a rotatividade é alta e o currículo não mostra o que mais importa: como a pessoa atende, reage sob pressão e trabalha em equipe.</p>
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          {[['💸', 'Rescisão e retrabalho', 'Cada contratação errada vira custo de desligamento e de uma nova seleção.'],
            ['⏳', 'Treinamento perdido', 'Semanas ensinando alguém que não tinha o perfil da função.'],
            ['😕', 'Cliente mal atendido', 'Quem sente primeiro é o cliente, e ele nem sempre volta.']].map(([e, t, d]) => (
            <div key={t} className="rounded-2xl border bg-slate-50 p-6">
              <div className="text-3xl">{e}</div>
              <p className="font-bold text-lg mt-3">{t}</p>
              <p className="text-slate-600 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-teal-50/60 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm font-bold tracking-wider uppercase text-teal-600">Como funciona</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mt-2">Da vaga ao candidato certo em 3 passos</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {PASSOS.map((p) => (
              <div key={p.n} className="relative bg-white rounded-2xl p-7 shadow-sm border">
                <span className="absolute -top-4 left-7 w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-teal-600 text-white font-bold flex items-center justify-center">{p.n}</span>
                <div className="text-4xl mt-2">{p.icone}</div>
                <p className="font-bold text-xl mt-3">{p.titulo}</p>
                <p className="text-slate-600 mt-2">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vídeo */}
      <section id="video" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">Veja o ContrateJá funcionando</h2>
        <p className="text-center text-slate-500 mt-3">Em pouco mais de 2 minutos, do link da vaga ao relatório de turnover.</p>
        <div className="mt-8 rounded-3xl overflow-hidden shadow-2xl border bg-slate-900">
          <video controls preload="none" playsInline poster="/video/capa-video.jpg" className="w-full aspect-video">
            <source src="/video/contrateja-como-funciona.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="text-center mt-8"><Botao grande>Quero testar grátis →</Botao></div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="bg-slate-900 text-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm font-bold tracking-wider uppercase text-lime-300">Recursos</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mt-2">Tudo o que você precisa para contratar e reter</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-2xl">{r.icone}</div>
                <p className="font-bold text-lg mt-4">{r.titulo}</p>
                <p className="text-slate-300 mt-1">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segmentos */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold">Feito para o food service</h2>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {SEGMENTOS.map((s) => (
            <span key={s.n} className="inline-flex items-center gap-2 rounded-2xl border bg-white px-5 py-3 text-lg font-semibold shadow-sm"><span className="text-2xl">{s.e}</span>{s.n}</span>
          ))}
        </div>
        <p className="text-slate-500 mt-8 max-w-3xl mx-auto">Perfis prontos para {FUNCOES.join(', ')}.</p>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-teal-50/60 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm font-bold tracking-wider uppercase text-teal-600">Planos</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mt-2">Comece grátis. Cresça quando precisar.</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-10 items-stretch">
            {PLANOS.map((p) => (
              <div key={p.nome} className={`rounded-3xl p-7 flex flex-col bg-white ${p.destaque ? 'border-2 border-teal-500 shadow-xl relative' : 'border shadow-sm'}`}>
                {p.destaque && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-lime-400 text-slate-900 text-xs font-extrabold px-3 py-1 rounded-full">MAIS COMPLETO</span>}
                <p className="font-bold text-teal-700">{p.nome}</p>
                <p className="mt-2"><span className="text-4xl font-extrabold">{p.preco}</span><span className="text-slate-500">{p.sufixo}</span></p>
                <ul className="mt-5 space-y-2.5 text-slate-700 flex-1">
                  {p.itens.map((i) => <li key={i} className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>{i}</li>)}
                </ul>
                <div className="mt-7"><Link href={CADASTRO} className={`block text-center rounded-2xl px-5 py-3 font-bold ${p.destaque ? 'bg-gradient-to-r from-slate-700 to-teal-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}>{p.cta}</Link></div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-6">Precisa de mais alguns links no mês? Pacotes avulsos de 5, 10 ou 20 links (R$ 3,00 cada), sem trocar de plano.</p>
        </div>
      </section>

      {/* Dúvidas */}
      <section id="duvidas" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">Dúvidas frequentes</h2>
        <div className="mt-8 space-y-3">
          {DUVIDAS.map((d) => (
            <details key={d.p} className="group rounded-2xl border bg-white p-5 open:shadow-md">
              <summary className="cursor-pointer list-none flex justify-between items-center gap-4 font-semibold">
                {d.p}<span className="text-teal-600 text-xl group-open:rotate-45 transition">＋</span>
              </summary>
              <p className="text-slate-600 mt-3">{d.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Chamada final */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-slate-800 via-teal-700 to-lime-500 text-white text-center px-6 py-14">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">Sua próxima contratação<br className="hidden sm:block" /> pode ser a certa.</h2>
          <p className="mt-4 text-lg text-white/90">Crie sua conta grátis e gere o primeiro link hoje.</p>
          <div className="mt-8"><Botao claro grande>Comece grátis com 20 links →</Botao></div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="" className="w-7 h-7 rounded-md object-contain bg-slate-800" />
            <span className="font-semibold text-slate-700">ContrateJá</span>
            <span>· Talentos que fazem a diferença no seu negócio</span>
          </div>
          <div className="flex flex-wrap gap-5 justify-center">
            <a href="/manual-contrateja.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-teal-700">📘 Manual do usuário</a>
            <a href="mailto:suporte@contrateja.app.br" className="hover:text-teal-700">suporte@contrateja.app.br</a>
            <Link href="/login" className="hover:text-teal-700">Entrar</Link>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 pb-6">Desenvolvido por Fábio de Moura</p>
      </footer>
    </div>
  )
}
