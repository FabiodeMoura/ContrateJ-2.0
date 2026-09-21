'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const CHAVES = ['p', 'd', 'm', 'a', 'de', 'ate']

function hojeEmBrasilia() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)
}

// Calendário do painel: ver por dia, mês, ano ou um intervalo de datas.
// O período escolhido fica na URL e vale para a tela inteira.
export default function FiltroPeriodo() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tipo = searchParams.get('p') ?? 'todos'
  const hoje = hojeEmBrasilia()
  const anoAtual = Number(hoje.slice(0, 4))
  const anos: number[] = []
  for (let a = anoAtual; a >= 2025; a--) anos.push(a)

  function aplicar(alteracoes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(alteracoes).forEach(([chave, valor]) => {
      if (valor === null) params.delete(chave)
      else params.set(chave, valor)
    })
    const texto = params.toString()
    router.push(texto ? `${pathname}?${texto}` : pathname)
  }

  function mudarTipo(novo: string) {
    const limpar: Record<string, string | null> = { d: null, m: null, a: null, de: null, ate: null }
    if (novo === 'todos') {
      aplicar({ ...limpar, p: null })
    } else if (novo === 'dia') {
      aplicar({ ...limpar, p: novo, d: hoje })
    } else if (novo === 'mes') {
      aplicar({ ...limpar, p: novo, m: hoje.slice(0, 7) })
    } else if (novo === 'ano') {
      aplicar({ ...limpar, p: novo, a: String(anoAtual) })
    } else if (novo === 'intervalo') {
      aplicar({ ...limpar, p: novo, de: `${hoje.slice(0, 7)}-01`, ate: hoje })
    } else {
      aplicar({ ...limpar, p: novo })
    }
  }

  const campo = 'border rounded-lg px-3 py-2 text-sm bg-white'

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500 hidden sm:inline">📅 Período</span>
      <select value={tipo} onChange={(e) => mudarTipo(e.target.value)} className={campo}>
        <option value="todos">Todo o período</option>
        <option value="hoje">Hoje</option>
        <option value="mes_atual">Este mês</option>
        <option value="ano_atual">Este ano</option>
        <option value="dia">Escolher um dia</option>
        <option value="mes">Escolher um mês</option>
        <option value="ano">Escolher um ano</option>
        <option value="intervalo">Intervalo de datas</option>
      </select>

      {tipo === 'dia' && (
        <input
          type="date"
          className={campo}
          value={searchParams.get('d') ?? hoje}
          onChange={(e) => e.target.value && aplicar({ d: e.target.value })}
        />
      )}
      {tipo === 'mes' && (
        <input
          type="month"
          className={campo}
          value={searchParams.get('m') ?? hoje.slice(0, 7)}
          onChange={(e) => e.target.value && aplicar({ m: e.target.value })}
        />
      )}
      {tipo === 'ano' && (
        <select
          className={campo}
          value={searchParams.get('a') ?? String(anoAtual)}
          onChange={(e) => aplicar({ a: e.target.value })}
        >
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      )}
      {tipo === 'intervalo' && (
        <>
          <input
            type="date"
            className={campo}
            value={searchParams.get('de') ?? ''}
            onChange={(e) => aplicar({ de: e.target.value || null })}
          />
          <span className="text-xs text-gray-500">até</span>
          <input
            type="date"
            className={campo}
            value={searchParams.get('ate') ?? ''}
            onChange={(e) => aplicar({ ate: e.target.value || null })}
          />
        </>
      )}
    </div>
  )
}
