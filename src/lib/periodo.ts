// Filtro de período (dia, mês, ano ou intervalo) usado no painel, nos relatórios e nas vagas.
// Os parâmetros ficam na URL: p (tipo), d (dia), m (mês), a (ano), de / ate (intervalo).
// Os dias são contados no horário de Brasília (UTC-3).

export interface ParametrosPeriodo {
  p?: string
  d?: string
  m?: string
  a?: string
  de?: string
  ate?: string
}

export interface Periodo {
  tipo: string // todos | hoje | mes_atual | ano_atual | dia | mes | ano | intervalo
  inicio: string | null // ISO, inclusivo
  fim: string | null // ISO, exclusivo
  rotulo: string
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const EH_DIA = /^\d{4}-\d{2}-\d{2}$/
const EH_MES = /^\d{4}-\d{2}$/
const EH_ANO = /^\d{4}$/

export function hojeEmBrasilia(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)
}

function diaParaIso(ymd: string): string | null {
  if (!EH_DIA.test(ymd)) return null
  const d = new Date(`${ymd}T00:00:00-03:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function somaDias(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return '' // data inválida na URL: quem chama trata como sem período
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatarDia(ymd: string): string {
  const [a, m, d] = ymd.split('-')
  return `${d}/${m}/${a}`
}

function periodoDoMes(ym: string, tipo: string): Periodo | null {
  if (!EH_MES.test(ym)) return null
  const ano = Number(ym.slice(0, 4))
  const mes = Number(ym.slice(5, 7))
  if (mes < 1 || mes > 12) return null
  const proximo = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, '0')}`
  const inicio = diaParaIso(`${ym}-01`)
  const fim = diaParaIso(`${proximo}-01`)
  if (!inicio || !fim) return null
  const nome = MESES[mes - 1]
  return { tipo, inicio, fim, rotulo: `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}` }
}

function periodoDoAno(a: string, tipo: string): Periodo | null {
  if (!EH_ANO.test(a)) return null
  const inicio = diaParaIso(`${a}-01-01`)
  const fim = diaParaIso(`${Number(a) + 1}-01-01`)
  if (!inicio || !fim) return null
  return { tipo, inicio, fim, rotulo: `Ano de ${a}` }
}

const TODOS: Periodo = { tipo: 'todos', inicio: null, fim: null, rotulo: 'Todo o período' }

export function resolverPeriodo(params: ParametrosPeriodo): Periodo {
  const tipo = params.p ?? 'todos'

  if (tipo === 'hoje') {
    const hoje = hojeEmBrasilia()
    const inicio = diaParaIso(hoje)
    const fim = diaParaIso(somaDias(hoje, 1))
    return inicio && fim ? { tipo, inicio, fim, rotulo: `Hoje (${formatarDia(hoje)})` } : TODOS
  }
  if (tipo === 'mes_atual') return periodoDoMes(hojeEmBrasilia().slice(0, 7), tipo) ?? TODOS
  if (tipo === 'ano_atual') return periodoDoAno(hojeEmBrasilia().slice(0, 4), tipo) ?? TODOS

  if (tipo === 'dia' && params.d) {
    const inicio = diaParaIso(params.d)
    const fim = diaParaIso(somaDias(params.d, 1))
    return inicio && fim ? { tipo, inicio, fim, rotulo: `Dia ${formatarDia(params.d)}` } : TODOS
  }
  if (tipo === 'mes' && params.m) return periodoDoMes(params.m, tipo) ?? TODOS
  if (tipo === 'ano' && params.a) return periodoDoAno(params.a, tipo) ?? TODOS

  if (tipo === 'intervalo' && (params.de || params.ate)) {
    const inicio = params.de ? diaParaIso(params.de) : null
    const fim = params.ate && EH_DIA.test(params.ate) ? diaParaIso(somaDias(params.ate, 1)) : null
    if (!inicio && !fim) return TODOS
    const rotulo =
      params.de && params.ate
        ? `${formatarDia(params.de)} a ${formatarDia(params.ate)}`
        : params.de
        ? `A partir de ${formatarDia(params.de)}`
        : `Até ${formatarDia(params.ate!)}`
    return { tipo, inicio, fim, rotulo }
  }

  return TODOS
}

// Aplica o período (início inclusivo, fim exclusivo) a uma consulta do Supabase
export function aplicarPeriodo<T>(consulta: T, coluna: string, periodo: Periodo): T {
  let q: any = consulta
  if (periodo.inicio) q = q.gte(coluna, periodo.inicio)
  if (periodo.fim) q = q.lt(coluna, periodo.fim)
  return q as T
}

// Confere se uma data (texto ISO do banco) cai dentro do período
export function estaNoPeriodo(data: string | null | undefined, periodo: Periodo): boolean {
  if (periodo.tipo === 'todos') return true
  if (!data) return false
  const t = new Date(data).getTime()
  if (Number.isNaN(t)) return false
  if (periodo.inicio && t < new Date(periodo.inicio).getTime()) return false
  if (periodo.fim && t >= new Date(periodo.fim).getTime()) return false
  return true
}
