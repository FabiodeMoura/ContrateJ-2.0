'use client'

import * as XLSX from 'xlsx'

interface CandidatoExport {
  nome_completo: string
  email: string
  whatsapp: string
  percentual_aderencia: number | null
  recomendacao: string | null
  status: string
  vagas?: { funcao: string } | { funcao: string }[]
}

export default function ExportarExcelButton({ candidatos }: { candidatos: CandidatoExport[] }) {
  function exportar() {
    const linhas = candidatos.map((c) => {
      const vaga = Array.isArray(c.vagas) ? c.vagas[0] : c.vagas
      return {
        'Nome completo': c.nome_completo,
        'E-mail': c.email,
        'WhatsApp': c.whatsapp,
        'Vaga': vaga?.funcao ?? '',
        'Aderência (%)': c.percentual_aderencia ?? '',
        'Recomendação': c.recomendacao ?? '',
        'Status': c.status,
      }
    })

    const planilha = XLSX.utils.json_to_sheet(linhas)
    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, planilha, 'Candidatos')
    XLSX.writeFile(livro, `contrateja-candidatos-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <button
      onClick={exportar}
      className="border bg-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5"
    >
      📊 Exportar para Excel
    </button>
  )
}
