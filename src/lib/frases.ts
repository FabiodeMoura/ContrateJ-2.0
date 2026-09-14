// Identidade de escrita do ContrateJá: tom direto, confiante e focado em
// pessoas e resultado — nunca genérico ou corporativo demais.
// Usado no login, no menu lateral e em espaços de destaque pelo sistema.

export const MARCA = {
  nome: 'ContrateJá',
  tagline: 'Talentos que fazem a diferença no seu negócio',
  missao: 'Contrate certo desde a primeira entrevista.',
} as const

export const FRASES_EFEITO = [
  'Grandes resultados começam com boas contratações.',
  'Cada boa contratação é um problema a menos amanhã.',
  'Quem contrata certo, gerencia menos crise.',
  'A pessoa certa muda o resultado do seu time inteiro.',
  'Contratar bem é o primeiro passo pra um time que dura.',
] as const

export const VALORES_LOGIN = [
  { icone: '🎯', texto: 'Perfil comportamental certeiro' },
  { icone: '⚡', texto: 'Link de avaliação pronto em segundos' },
  { icone: '📊', texto: 'Decisão de contratação baseada em dados' },
] as const

// escolhe uma frase de efeito de forma estável (mesma frase o dia todo,
// não muda a cada clique/reload — dá previsibilidade sem ser sempre igual)
export function fraseDoDia(): string {
  const dia = new Date().getDate()
  return FRASES_EFEITO[dia % FRASES_EFEITO.length]
}
