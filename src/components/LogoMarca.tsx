export default function LogoMarca({
  altura = 22,
  className = '',
}: {
  altura?: number
  className?: string
}) {
  return (
    <img
      src="/logo-wordmark.png"
      alt="ContrateJá"
      className={className}
      style={{ height: altura, width: 'auto', display: 'block' }}
    />
  )
}
