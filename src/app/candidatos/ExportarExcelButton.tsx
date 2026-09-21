'use client'

import * as XLSX from 'xlsx'

interface CandidatoExport {
  nome_completo: string
  email: string
  whatsapp: string
  cidade?: string | null
  formacao?: string | null
  experiencia_resumo?: string | null
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
        'Cidade': c.cidade ?? '',
        'Formação': c.formacao ?? '',
        'Experiência': c.experiencia_resumo ?? '',
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
      className="border bg-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full md:w-auto"
    >
      📊 Exportar para Excel
    </button>
  )
}
