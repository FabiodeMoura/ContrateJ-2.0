'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

interface Empresa {
  id: string
  nome_fantasia: string
}

interface LinhaPlanilha {
  Nome?: string
  Email?: string
  WhatsApp?: string
  CPF?: string
  Empresa?: string
  'Função'?: string
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export default function ImportarPlanilhaButton({ empresas }: { empresas: Empresa[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<{ importados: number; ignorados: string[] } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function processarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    setCarregando(true)
    setResultado(null)

    const dados = await arquivo.arrayBuffer()
    const livro = XLSX.read(dados)
    const planilha = livro.Sheets[livro.SheetNames[0]]
    const linhas: LinhaPlanilha[] = XLSX.utils.sheet_to_json(planilha)

    const paraInserir: any[] = []
    const ignorados: string[] = []

    for (const linha of linhas) {
      const nome = linha.Nome?.toString().trim()
      const nomeEmpresaPlanilha = linha.Empresa?.toString().trim()

      if (!nome || !nomeEmpresaPlanilha) {
        ignorados.push(`Linha sem nome ou empresa: ${JSON.stringify(linha)}`)
        continue
      }

      const empresaEncontrada = empresas.find(
        (e) => normalizar(e.nome_fantasia) === normalizar(nomeEmpresaPlanilha)
      )

      if (!empresaEncontrada) {
        ignorados.push(`${nome}: empresa "${nomeEmpresaPlanilha}" não encontrada`)
        continue
      }

      paraInserir.push({
        empresa_id: empresaEncontrada.id,
        nome_completo: nome,
        email: linha.Email?.toString().trim() ?? null,
        whatsapp: linha.WhatsApp?.toString().trim() ?? null,
        cpf: linha.CPF?.toString().trim() ?? null,
        funcao: linha['Função']?.toString().trim() ?? null,
        status: 'Ativo',
      })
    }

    if (paraInserir.length > 0) {
      const { error } = await supabase.from('colaboradores').insert(paraInserir)
      if (error) {
        setCarregando(false)
        setResultado({ importados: 0, ignorados: [`Erro ao salvar: ${error.message}`] })
        if (inputRef.current) inputRef.current.value = ''
        return
      }
    }

    setCarregando(false)
    setResultado({ importados: paraInserir.length, ignorados })
    if (inputRef.current) inputRef.current.value = ''
    router.refresh()
  }

  return (
    <div className="w-full md:w-auto">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={processarArquivo}
        className="hidden"
        id="importar-colaboradores"
      />
      <label
        htmlFor="importar-colaboradores"
        className="cursor-pointer bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full md:w-auto"
      >
        {carregando ? 'Importando...' : '⬆️ Importar planilha'}
      </label>

      {resultado && (
        <div className="mt-2 text-xs bg-white border rounded-lg p-3 max-w-sm">
          <p className="text-green-700 font-medium mb-1">
            ✅ {resultado.importados} colaborador(es) importado(s)
          </p>
          {resultado.ignorados.length > 0 && (
            <div className="text-amber-700">
              <p className="font-medium mb-1">⚠️ {resultado.ignorados.length} linha(s) ignorada(s):</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {resultado.ignorados.slice(0, 5).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
