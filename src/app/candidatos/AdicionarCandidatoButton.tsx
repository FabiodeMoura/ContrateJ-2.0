'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

interface Vaga {
  id: string
  funcao: string
  empresa_id: string
}

interface Empresa {
  id: string
  nome_fantasia: string
}

export default function AdicionarCandidatoButton({
  vagas,
  empresas,
  empresaIdPadrao,
}: {
  vagas: Vaga[]
  empresas: Empresa[]
  empresaIdPadrao: string
}) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [cidade, setCidade] = useState('')
  const [formacao, setFormacao] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [empresaId, setEmpresaId] = useState(empresaIdPadrao)
  const [vagaId, setVagaId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const entradaArquivo = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const empresasComVagas = empresas.filter((e) => vagas.some((v) => v.empresa_id === e.id))
  const vagasDaEmpresa = vagas.filter((v) => v.empresa_id === empresaId)
  const vagaEscolhida = vagasDaEmpresa.some((v) => v.id === vagaId) ? vagaId : vagasDaEmpresa[0]?.id ?? ''

  function abrir() {
    // Começa na empresa da tela; se ela não tiver vaga, na primeira empresa que tiver
    const inicial = vagas.some((v) => v.empresa_id === empresaIdPadrao) ? empresaIdPadrao : vagas[0]?.empresa_id ?? ''
    setEmpresaId(inicial)
    setVagaId('')
    setErro(null)
    setAviso(null)
    setAberto(true)
  }

  function limpar() {
    setNome('')
    setEmail('')
    setWhatsapp('')
    setCidade('')
    setFormacao('')
    setExperiencia('')
    setAviso(null)
  }

  async function importarCurriculo(arquivo: File) {
    setErro(null)
    setAviso(null)
    if (arquivo.size > 5 * 1024 * 1024) {
      setErro('O arquivo passa de 5 MB. Envie um menor.')
      return
    }
    setLendo(true)
    try {
      const formulario = new FormData()
      formulario.append('arquivo', arquivo)
      const resposta = await fetch('/api/curriculo/extrair', { method: 'POST', body: formulario })
      const corpo = await resposta.json().catch(() => ({}))
      if (!resposta.ok) {
        setErro(corpo?.erro ?? 'Não foi possível ler o currículo.')
        return
      }
      const d = corpo.dados ?? {}
      if (d.nome_completo) setNome(d.nome_completo)
      if (d.email) setEmail(d.email)
      if (d.whatsapp) setWhatsapp(d.whatsapp)
      if (d.cidade) setCidade(d.cidade)
      if (d.formacao) setFormacao(d.formacao)
      if (d.experiencia_resumo) setExperiencia(d.experiencia_resumo)
      setAviso('Dados preenchidos a partir do currículo. Confira antes de salvar.')
    } catch {
      setErro('Erro de conexão ao ler o currículo. Tente de novo.')
    } finally {
      setLendo(false)
      if (entradaArquivo.current) entradaArquivo.current.value = ''
    }
  }

  async function salvar() {
    if (!nome || !email || !whatsapp || !vagaEscolhida) return
    setSalvando(true)
    setErro(null)

    const { error } = await supabase.from('candidatos').insert({
      vaga_id: vagaEscolhida,
      nome_completo: nome.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      cidade: cidade.trim() || null,
      formacao: formacao.trim() || null,
      experiencia_resumo: experiencia.trim() || null,
      status: 'Em análise',
    })

    setSalvando(false)

    if (error) {
      console.error('Erro ao cadastrar candidato:', error)
      setErro(`Não foi possível salvar: ${error.message}`)
      return
    }

    setAberto(false)
    limpar()
    // Se o candidato foi para outra empresa, mostra a lista dela
    if (empresaId !== empresaIdPadrao) router.push(`/candidatos?empresa=${empresaId}`)
    else router.refresh()
  }

  const campo = 'w-full border rounded-lg px-3 py-2 text-sm mb-3'

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        disabled={vagas.length === 0}
        className="border bg-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
        title={vagas.length === 0 ? 'Crie uma vaga antes de cadastrar candidatos' : ''}
      >
        + Cadastrar candidato
      </button>

      {aberto && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setAberto(false)}
        >
          <div
            className="bg-white rounded-xl p-5 w-full max-w-md max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium text-sm mb-3">Cadastrar candidato</p>

            {/* Importar currículo: preenche os campos sozinho */}
            <input
              ref={entradaArquivo}
              type="file"
              accept=".pdf,.docx,.txt,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0]
                if (arquivo) importarCurriculo(arquivo)
              }}
            />
            <button
              type="button"
              onClick={() => entradaArquivo.current?.click()}
              disabled={lendo}
              className="w-full border-2 border-dashed border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 rounded-xl px-3 py-3 text-sm text-indigo-700 font-medium mb-1 disabled:opacity-60"
            >
              {lendo ? '⏳ Lendo o currículo...' : '📄 Importar currículo (PDF, Word ou foto)'}
            </button>
            <p className="text-[11px] text-gray-400 mb-3">
              O sistema lê o currículo e preenche os campos. O arquivo não fica guardado.
            </p>
            {aviso && <p className="text-green-700 text-xs bg-green-50 rounded-lg px-3 py-2 mb-3">{aviso}</p>}

            <input
              type="text"
              placeholder="Nome completo"
              className={campo}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              type="email"
              placeholder="E-mail"
              className={campo}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="WhatsApp"
              className={campo}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <input
              type="text"
              placeholder="Cidade (opcional)"
              className={campo}
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
            <input
              type="text"
              placeholder="Formação (opcional)"
              className={campo}
              value={formacao}
              onChange={(e) => setFormacao(e.target.value)}
            />
            <textarea
              placeholder="Experiência resumida (opcional)"
              rows={3}
              className={`${campo} resize-none`}
              value={experiencia}
              onChange={(e) => setExperiencia(e.target.value)}
            />

            {empresasComVagas.length > 1 && (
              <>
                <p className="text-xs text-gray-500 mb-1.5">Empresa</p>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                  value={empresaId}
                  onChange={(e) => {
                    setEmpresaId(e.target.value)
                    setVagaId('')
                  }}
                >
                  {empresasComVagas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                  ))}
                </select>
              </>
            )}

            <p className="text-xs text-gray-500 mb-1.5">Vaga</p>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              value={vagaEscolhida}
              onChange={(e) => setVagaId(e.target.value)}
            >
              {vagasDaEmpresa.map((v) => (
                <option key={v.id} value={v.id}>{v.funcao}</option>
              ))}
            </select>

            <p className="text-[11px] text-gray-400 mb-3">
              O candidato entra na lista sem avaliação DISC ainda — envie o link do questionário
              pela tela de Vagas quando quiser avaliá-lo.
            </p>

            {erro && <p className="text-red-600 text-xs mb-3">{erro}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || lendo || !nome || !email || !whatsapp || !vagaEscolhida}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
