export interface PerguntaSaida {
  ordem: number
  texto: string
  opcoes: string[]
}

export const PERGUNTAS_SAIDA: PerguntaSaida[] = [
  { ordem: 1, texto: 'Como você avalia sua experiência geral na empresa?', opcoes: ['Ótima', 'Boa', 'Regular', 'Ruim'] },
  { ordem: 2, texto: 'Você recomendaria essa empresa como um bom lugar pra trabalhar?', opcoes: ['Sim', 'Talvez', 'Não'] },
  { ordem: 3, texto: 'Como era o relacionamento com seu gestor direto?', opcoes: ['Ótimo', 'Bom', 'Regular', 'Ruim'] },
  { ordem: 4, texto: 'Você sentiu que seu trabalho era reconhecido?', opcoes: ['Sempre', 'Às vezes', 'Raramente', 'Nunca'] },
  { ordem: 5, texto: 'O salário e os benefícios atendiam suas expectativas?', opcoes: ['Sim', 'Parcialmente', 'Não'] },
  { ordem: 6, texto: 'Como você avalia o ambiente de trabalho com a equipe?', opcoes: ['Ótimo', 'Bom', 'Regular', 'Ruim'] },
  { ordem: 7, texto: 'Você teve oportunidades de crescimento na empresa?', opcoes: ['Sim', 'Não', 'Não sei dizer'] },
  { ordem: 8, texto: 'A comunicação da empresa com você era clara?', opcoes: ['Sempre', 'Às vezes', 'Raramente'] },
  { ordem: 9, texto: 'O que mais pesou na sua decisão de sair (ou no desligamento)?', opcoes: ['Salário', 'Ambiente de trabalho', 'Gestão/liderança', 'Oportunidade em outro lugar', 'Outro motivo'] },
  { ordem: 10, texto: 'No geral, você teria continuado na empresa se pudesse?', opcoes: ['Sim, com certeza', 'Talvez', 'Não'] },
]

// Pontos que o relatório de turnover resume em frases como
// "3 colaboradores apontaram o clima da empresa".
// "negativas" são as respostas que contam como "apontou esse ponto".
export interface PontoDeAtencao {
  ordem: number // pergunta da pesquisa que originou o ponto
  frase: string // completa "N colaboradores apontaram ___"
  negativas: string[]
}

export const PONTOS_DE_ATENCAO: PontoDeAtencao[] = [
  { ordem: 6, frase: 'o clima da empresa (ambiente com a equipe)', negativas: ['Regular', 'Ruim'] },
  { ordem: 3, frase: 'o relacionamento com o gestor', negativas: ['Regular', 'Ruim'] },
  { ordem: 4, frase: 'a falta de reconhecimento', negativas: ['Raramente', 'Nunca'] },
  { ordem: 5, frase: 'o salário e os benefícios', negativas: ['Parcialmente', 'Não'] },
  { ordem: 7, frase: 'a falta de oportunidade de crescimento', negativas: ['Não'] },
  { ordem: 8, frase: 'a comunicação da empresa', negativas: ['Raramente'] },
]

// Nome curto de cada pergunta, para o relatório de turnover ficar compacto.
export const TITULO_CURTO: Record<number, string> = {
  1: 'Experiência geral',
  2: 'Recomendaria a empresa',
  3: 'Relacionamento com o gestor',
  4: 'Reconhecimento',
  5: 'Salário e benefícios',
  6: 'Ambiente com a equipe',
  7: 'Oportunidade de crescimento',
  8: 'Comunicação da empresa',
  9: 'Principal motivo da saída',
  10: 'Teria continuado na empresa',
}
