const ESTILOS: Record<string, { cor: string; icone: string; label: string }> = {
  'Recomendado': { cor: 'bg-green-100 text-green-700', icone: '✅', label: 'Ótima aderência' },
  'Avaliar': { cor: 'bg-amber-100 text-amber-700', icone: '⚠️', label: 'Atenção especial' },
  'Não recomendado': { cor: 'bg-red-100 text-red-700', icone: '⛔', label: 'Não recomendado' },
}

export default function RecomendacaoBadge({ recomendacao }: { recomendacao: string | null }) {
  if (!recomendacao) {
    return <span className="text-xs text-gray-400">Calculando...</span>
  }

  const estilo = ESTILOS[recomendacao] ?? { cor: 'bg-gray-100 text-gray-600', icone: '—', label: recomendacao }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${estilo.cor}`}>
      {estilo.icone} {estilo.label}
    </span>
  )
}
