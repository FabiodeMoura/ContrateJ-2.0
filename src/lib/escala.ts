// Regras da Escala de Trabalho (módulo vendido à parte).
// Datas sempre no formato 'AAAA-MM-DD', tratadas em UTC para não ter erro de fuso.

export const PRECO_ESCALA = 'R$ 49,90'

// Link de compra da Escala na Hotmart. Definir NEXT_PUBLIC_HOTMART_LINK_ESCALA no Render
// (link de pagamento da oferta de R$ 49,90). Sem ele, o botão aparece como "Em breve".
export const LINK_COMPRA_ESCALA = process.env.NEXT_PUBLIC_HOTMART_LINK_ESCALA || null

export type Jornada = '6x1' | '5x2' | '12x36'
export type TipoOcorrencia = 'falta' | 'atestado' | 'ferias'

export interface ConfigColab {
  colaborador_id: string
  empresa_id: string
  jornada: Jornada
  folgas: number[]
  inicio_12x36: string | null
  hora_entrada: string | null
  hora_saida: string | null
}

export interface Ocorrencia {
  id: string
  colaborador_id: string
  empresa_id: string
  tipo: TipoOcorrencia
  inicio: string
  fim: string
  observacao: string | null
}

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const NOME_OCORRENCIA: Record<TipoOcorrencia, string> = { falta: 'Falta', atestado: 'Atestado', ferias: 'Férias' }
export const SIGLA_OCORRENCIA: Record<TipoOcorrencia, string> = { falta: 'FA', atestado: 'AT', ferias: 'FE' }

export function paraData(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

export function paraIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function diaDaSemana(iso: string): number {
  return paraData(iso).getUTCDay()
}

export function hojeIso(): string {
  // Data de hoje no horário de Brasília
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function diasDoMes(mes: string): string[] {
  const [a, m] = mes.split('-').map(Number)
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)
}

export function mesValido(mes: string | undefined): string {
  if (mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return mes
  return hojeIso().slice(0, 7)
}

export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + n, 1))
  return paraIso(d).slice(0, 7)
}

export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  const nome = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`
}

export const CONFIG_PADRAO: Omit<ConfigColab, 'colaborador_id' | 'empresa_id'> = {
  jornada: '6x1',
  folgas: [0],
  inicio_12x36: null,
  hora_entrada: null,
  hora_saida: null,
}

// O colaborador trabalha nesse dia pela jornada padrão (sem contar trocas e ocorrências)?
export function trabalhaPelaJornada(cfg: Omit<ConfigColab, 'colaborador_id' | 'empresa_id'>, dia: string): boolean {
  if (cfg.jornada === '12x36') {
    const base = cfg.inicio_12x36 ?? `${dia.slice(0, 7)}-01`
    const diferenca = Math.round((paraData(dia).getTime() - paraData(base).getTime()) / 86400000)
    return ((diferenca % 2) + 2) % 2 === 0
  }
  return !(cfg.folgas ?? []).includes(diaDaSemana(dia))
}

export function ocorrenciaDoDia(ocorrencias: Ocorrencia[], colaboradorId: string, dia: string): Ocorrencia | undefined {
  return ocorrencias.find((o) => o.colaborador_id === colaboradorId && o.inicio <= dia && o.fim >= dia)
}

export function horario(h: string | null): string {
  return h ? h.slice(0, 5) : ''
}

// ---------- Filtro de período da escala ----------
// Parâmetros na URL: p = mes | semana | intervalo; m = AAAA-MM; d = um dia da semana; de / ate = intervalo.
export const MAX_DIAS_INTERVALO = 92

export interface ParametrosPeriodoEscala { p?: string; m?: string; d?: string; de?: string; ate?: string; mes?: string }

export interface PeriodoEscala {
  tipo: 'mes' | 'semana' | 'intervalo'
  dias: string[]
  rotulo: string
  anterior: Record<string, string>
  proximo: Record<string, string>
  aviso: string | null
}

const EH_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export function somarDias(dia: string, n: number): string {
  const d = paraData(dia)
  d.setUTCDate(d.getUTCDate() + n)
  return paraIso(d)
}

function intervalo(inicio: string, fim: string): string[] {
  const dias: string[] = []
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d)
  return dias
}

function diaBr(dia: string): string {
  return dia.split('-').reverse().join('/')
}

export function periodoEscala(q: ParametrosPeriodoEscala): PeriodoEscala {
  const hoje = hojeIso()
  const tipo = q.p === 'semana' || q.p === 'intervalo' ? q.p : 'mes'

  if (tipo === 'semana') {
    const base = q.d && EH_DIA.test(q.d) ? q.d : hoje
    const segunda = somarDias(base, -((diaDaSemana(base) + 6) % 7))
    const domingo = somarDias(segunda, 6)
    return {
      tipo, dias: intervalo(segunda, domingo),
      rotulo: `Semana de ${diaBr(segunda)} a ${diaBr(domingo)}`,
      anterior: { p: 'semana', d: somarDias(segunda, -7) },
      proximo: { p: 'semana', d: somarDias(segunda, 7) },
      aviso: null,
    }
  }

  if (tipo === 'intervalo') {
    let de = q.de && EH_DIA.test(q.de) ? q.de : `${hoje.slice(0, 7)}-01`
    let ate = q.ate && EH_DIA.test(q.ate) ? q.ate : hoje
    if (ate < de) [de, ate] = [ate, de]
    let aviso: string | null = null
    const total = Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86400000) + 1
    if (total > MAX_DIAS_INTERVALO) {
      ate = somarDias(de, MAX_DIAS_INTERVALO - 1)
      aviso = `O período foi limitado a ${MAX_DIAS_INTERVALO} dias (até ${diaBr(ate)}) para a escala caber na tela.`
    }
    const tamanho = Math.min(total, MAX_DIAS_INTERVALO)
    return {
      tipo, dias: intervalo(de, ate),
      rotulo: `${diaBr(de)} a ${diaBr(ate)}`,
      anterior: { p: 'intervalo', de: somarDias(de, -tamanho), ate: somarDias(de, -1) },
      proximo: { p: 'intervalo', de: somarDias(ate, 1), ate: somarDias(ate, tamanho) },
      aviso,
    }
  }

  const mes = mesValido(q.m ?? q.mes)
  return {
    tipo: 'mes', dias: diasDoMes(mes), rotulo: nomeDoMes(mes),
    anterior: { p: 'mes', m: somarMeses(mes, -1) },
    proximo: { p: 'mes', m: somarMeses(mes, 1) },
    aviso: null,
  }
}
