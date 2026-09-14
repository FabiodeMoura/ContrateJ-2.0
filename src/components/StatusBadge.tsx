const ESTILOS: Record<string, string> = {
  'Ativa': 'bg-green-100 text-green-700',
  'Pausada': 'bg-gray-100 text-gray-600',
  'Encerrada': 'bg-red-100 text-red-700',
  'Em análise': 'bg-amber-100 text-amber-700',
  'Entrevistado': 'bg-blue-100 text-blue-700',
  'Aprovado': 'bg-green-100 text-green-700',
  'Reprovado': 'bg-red-100 text-red-700',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${ESTILOS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
