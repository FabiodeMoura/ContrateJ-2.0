// Pacotes de links avulsos (produto "ContrateJá — Links avulsos" no Hotmart).
// Cada pacote é uma oferta do produto; o código depois de "off=" identifica o pacote.
const PACOTES = [
  { links: 5, valor: 'R$ 15,00', link: 'https://pay.hotmart.com/F107702086L?off=14qrfp7g' },
  { links: 10, valor: 'R$ 30,00', link: 'https://pay.hotmart.com/F107702086L?off=krlon6t5' },
  { links: 20, valor: 'R$ 60,00', link: 'https://pay.hotmart.com/F107702086L?off=zbk64ocl' },
]

export default function ComprarLinksExtrasButton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {PACOTES.map((pacote) => (
        <a
          key={pacote.links}
          href={pacote.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block border rounded-xl p-4 text-center hover:border-teal-500 hover:bg-teal-50/40 transition"
        >
          <p className="text-2xl font-bold text-gray-900">{pacote.links}</p>
          <p className="text-xs text-gray-500 mb-2">links avulsos</p>
          <p className="text-sm font-semibold text-teal-700">{pacote.valor}</p>
          <p className="mt-3 text-xs font-medium bg-indigo-600 text-white rounded-lg py-2">Comprar no Hotmart</p>
        </a>
      ))}
    </div>
  )
}
