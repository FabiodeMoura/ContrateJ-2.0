import LogoMarca from './LogoMarca'

export default function BannerCandidato({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-teal-600 to-lime-400 px-6 py-6 text-center">
      <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-6 w-24 h-24 rounded-full bg-white/10" />
      <img src="/logo-icon.png" alt="" className="relative w-10 h-10 rounded-xl mx-auto mb-3 object-contain" />
      <div className="relative flex justify-center">
        <LogoMarca altura={26} />
      </div>
      {subtitulo && (
        <p className="relative text-teal-50 text-xs mt-2">{subtitulo}</p>
      )}
    </div>
  )
}
