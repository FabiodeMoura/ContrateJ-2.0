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
  nome: string
  email: string
  whatsapp: string
  cpf: string
  empresa: string
  funcao: string
}

type Campo = keyof LinhaPlanilha

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

// Reconhece os títulos das colunas do modelo novo ("Nome completo *", "WhatsApp (com DDD)"...)
// e do modelo antigo ("Nome", "Email"...). Compara só as letras, sem acento.
const CAMPOS: { campo: Campo; comeca: string[] }[] = [
  { campo: 'nome', comeca: ['nome'] },
  { campo: 'email', comeca: ['email'] },
  { campo: 'whatsapp', comeca: ['whatsapp', 'telefone', 'celular'] },
  { campo: 'cpf', comeca: ['cpf'] },
  { campo: 'empresa', comeca: ['empresa', 'loja', 'unidade'] },
  { campo: 'funcao', comeca: ['funcao', 'cargo'] },
]

function chave(texto: unknown) {
  return normalizar(String(texto ?? '')).replace(/[^a-z]/g, '')
}

function lerLinhas(livro: XLSX.WorkBook): LinhaPlanilha[] | null {
  const nomeAba = livro.SheetNames.find((n) => normalizar(n) === 'colaboradores') ?? livro.SheetNames[0]
  const matriz: unknown[][] = XLSX.utils.sheet_to_json(livro.Sheets[nomeAba], { header: 1, raw: false, defval: '' })

  // A linha de títulos pode não ser a primeira (o modelo tem a logo e instruções em cima)
  for (let i = 0; i < Math.min(matriz.length, 30); i++) {
    const titulos = matriz[i].map(chave)
    const posicao: Partial<Record<Campo, number>> = {}
    for (const { campo, comeca } of CAMPOS) {
      const idx = titulos.findIndex((t) => comeca.some((c) => t.startsWith(c)))
      if (idx >= 0) posicao[campo] = idx
    }
    if (posicao.nome === undefined || posicao.empresa === undefined) continue

    return matriz.slice(i + 1).map((linha) => {
      const valor = (campo: Campo) =>
        posicao[campo] === undefined ? '' : String(linha[posicao[campo]!] ?? '').trim()
      return {
        nome: valor('nome'),
        email: valor('email'),
        whatsapp: valor('whatsapp'),
        cpf: valor('cpf'),
        empresa: valor('empresa'),
        funcao: valor('funcao'),
      }
    })
  }
  return null
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
    const linhas = lerLinhas(livro)
    if (!linhas) {
      setCarregando(false)
      setResultado({
        importados: 0,
        ignorados: ['Não encontrei as colunas "Nome completo" e "Empresa". Use o modelo em "Baixar modelo".'],
      })
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const paraInserir: any[] = []
    const ignorados: string[] = []

    for (const linha of linhas) {
      const nome = linha.nome
      const nomeEmpresaPlanilha = linha.empresa

      // linha totalmente vazia (o modelo já vem com linhas formatadas) ou a linha de exemplo
      if (Object.values(linha).every((v) => !v)) continue
      if (normalizar(nome).startsWith('exemplo')) continue

      if (!nome || !nomeEmpresaPlanilha) {
        ignorados.push(`${nome || 'Linha sem nome'}: falta ${!nome ? 'o nome' : 'a empresa'}`)
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
        email: linha.email || null,
        whatsapp: linha.whatsapp || null,
        cpf: linha.cpf || null,
        funcao: linha.funcao || null,
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
