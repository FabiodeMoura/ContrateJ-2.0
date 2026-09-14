// Lista central de segmentos atendidos pelo ContrateJá — usada no painel,
// na tela de Vagas e na tela de escolha de segmento/função.
export const SEGMENTOS_INFO: Record<string, { emoji: string; cor: string }> = {
  Restaurante: { emoji: '🍽️', cor: 'from-orange-400 to-orange-600' },
  Bar: { emoji: '🍸', cor: 'from-pink-400 to-pink-600' },
  Lanchonete: { emoji: '🍔', cor: 'from-yellow-400 to-yellow-600' },
  Padaria: { emoji: '🍞', cor: 'from-sky-400 to-sky-600' },
  'Sacolão': { emoji: '🥬', cor: 'from-green-400 to-green-600' },
  Pizzaria: { emoji: '🍕', cor: 'from-red-400 to-red-600' },
}
