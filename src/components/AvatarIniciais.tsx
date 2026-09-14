const CORES = [
  'bg-indigo-100 text-indigo-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-purple-100 text-purple-700',
]

export default function AvatarIniciais({ nome }: { nome: string }) {
  const partes = nome.trim().split(' ')
  const iniciais = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
  const indice = nome.charCodeAt(0) % CORES.length

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${CORES[indice]}`}>
      {iniciais || '?'}
    </div>
  )
}
