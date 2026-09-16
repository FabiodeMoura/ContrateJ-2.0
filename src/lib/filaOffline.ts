// Fila local (localStorage) usada quando o candidato está sem internet:
// guarda o cadastro e as respostas do questionário no aparelho, e um
// componente de sincronização (ver SincronizarFila.tsx) reenvia tudo
// pro banco assim que a conexão voltar.

const CHAVE_CANDIDATOS = 'contrateja_fila_candidatos'
const CHAVE_RESPOSTAS = 'contrateja_fila_respostas'

export interface CandidatoPendente {
  id: string
  vaga_id: string
  nome_completo: string
  email: string
  whatsapp: string
}

export interface RespostasPendente {
  candidatoId: string
  respostas: { candidato_id: string; pergunta_id: string; opcao_escolhida: string }[]
}

function ler<T>(chave: string): T[] {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? JSON.parse(bruto) : []
  } catch {
    return []
  }
}

function escrever<T>(chave: string, itens: T[]) {
  localStorage.setItem(chave, JSON.stringify(itens))
}

export function salvarCandidatoPendente(item: CandidatoPendente) {
  const fila = ler<CandidatoPendente>(CHAVE_CANDIDATOS)
  fila.push(item)
  escrever(CHAVE_CANDIDATOS, fila)
}

export function obterCandidatosPendentes(): CandidatoPendente[] {
  return ler<CandidatoPendente>(CHAVE_CANDIDATOS)
}

export function removerCandidatoPendente(id: string) {
  escrever(CHAVE_CANDIDATOS, ler<CandidatoPendente>(CHAVE_CANDIDATOS).filter((c) => c.id !== id))
}

export function salvarRespostasPendente(item: RespostasPendente) {
  const fila = ler<RespostasPendente>(CHAVE_RESPOSTAS)
  fila.push(item)
  escrever(CHAVE_RESPOSTAS, fila)
}

export function obterRespostasPendentes(): RespostasPendente[] {
  return ler<RespostasPendente>(CHAVE_RESPOSTAS)
}

export function removerRespostasPendente(candidatoId: string) {
  escrever(CHAVE_RESPOSTAS, ler<RespostasPendente>(CHAVE_RESPOSTAS).filter((r) => r.candidatoId !== candidatoId))
}

export function temPendencias(): boolean {
  return obterCandidatosPendentes().length > 0 || obterRespostasPendentes().length > 0
}
