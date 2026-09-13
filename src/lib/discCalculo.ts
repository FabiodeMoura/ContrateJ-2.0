// ContrateJá — Cálculo de aderência DISC
// (A fonte da verdade é a função SQL `calcular_aderencia`, mas mantemos
// essa versão em TS para exibir uma prévia no frontend, se necessário.)

export type Resposta = 'D' | 'I' | 'S' | 'C'

export interface PerfilIdeal {
  peso_d: number
  peso_i: number
  peso_s: number
  peso_c: number
}

export interface ResultadoDisc {
  pontuacao_d: number
  pontuacao_i: number
  pontuacao_s: number
  pontuacao_c: number
  percentual_aderencia: number
  recomendacao: 'Recomendado' | 'Avaliar' | 'Não recomendado'
}

export function calcularAderencia(
  respostas: Resposta[],
  perfilIdeal: PerfilIdeal
): ResultadoDisc {
  const total = respostas.length

  const contagem = { D: 0, I: 0, S: 0, C: 0 }
  for (const r of respostas) contagem[r]++

  const pontuacao_d = round1((contagem.D / total) * 100)
  const pontuacao_i = round1((contagem.I / total) * 100)
  const pontuacao_s = round1((contagem.S / total) * 100)
  const pontuacao_c = round1((contagem.C / total) * 100)

  const diferenca =
    Math.abs(pontuacao_d - perfilIdeal.peso_d) +
    Math.abs(pontuacao_i - perfilIdeal.peso_i) +
    Math.abs(pontuacao_s - perfilIdeal.peso_s) +
    Math.abs(pontuacao_c - perfilIdeal.peso_c)

  const percentual_aderencia = round1(100 - diferenca / 2)

  let recomendacao: ResultadoDisc['recomendacao']
  if (percentual_aderencia >= 80) recomendacao = 'Recomendado'
  else if (percentual_aderencia >= 60) recomendacao = 'Avaliar'
  else recomendacao = 'Não recomendado'

  return {
    pontuacao_d,
    pontuacao_i,
    pontuacao_s,
    pontuacao_c,
    percentual_aderencia,
    recomendacao,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
