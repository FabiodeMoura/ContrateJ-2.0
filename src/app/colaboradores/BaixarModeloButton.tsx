'use client'

import * as XLSX from 'xlsx'

export default function BaixarModeloButton() {
  function baixar() {
    const linhas = [
      {
        'Nome': 'Maria da Silva',
        'Email': 'maria@exemplo.com',
        'WhatsApp': '11999999999',
        'CPF': '12345678900',
        'Empresa': 'Nome exato da empresa cadastrada no ContrateJá',
        'Função': 'Garçom',
      },
    ]
    const planilha = XLSX.utils.json_to_sheet(linhas)
    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, planilha, 'Colaboradores')
    XLSX.writeFile(livro, 'contrateja-modelo-colaboradores.xlsx')
  }

  return (
    <button
      onClick={baixar}
      className="border bg-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full md:w-auto"
    >
      ⬇️ Baixar modelo
    </button>
  )
}
