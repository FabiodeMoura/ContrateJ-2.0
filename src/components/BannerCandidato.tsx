export default function BannerCandidato({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 px-6 py-6 text-center">
      <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-6 w-24 h-24 rounded-full bg-white/10" />
      <div className="relative w-10 h-10 rounded-xl bg-white/15 mx-auto mb-2 flex items-center justify-center text-lg">
        💼
      </div>
      <p className="relative text-white font-bold text-xl tracking-tight">ContrateJá</p>
      {subtitulo && (
        <p className="relative text-indigo-100 text-xs mt-1">{subtitulo}</p>
      )}
    </div>
  )
}
