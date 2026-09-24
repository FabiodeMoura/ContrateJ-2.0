'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { verificarEIncrementarUso } from '@/lib/usoLinks'

interface ItemFila {
  id: string
  nome_completo: string
  email: string
  whatsapp: string
  cidade: string | null
  formacao: string | null
  experiencia_resumo: string | null
  destaque_ia: string | null
  status: string
  vaga_id: string
  funcao: string
  nome_empresa: string
  empresa_id: string
  token_link: string
}

interface Envio {
  nome: string
  mensagem: string
  link: string
}

function linkAvaliacao(tokenLink: string, candidatoId: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/quiz/${tokenLink}?candidato=${candidatoId}`
}

function mensagemPadrao(item: ItemFila, link: string) {
  const primeiroNome = item.nome_completo.split(' ')[0]
  return `Olá, ${primeiroNome}! Recebemos seu currículo para a vaga de ${item.funcao} na ${item.nome_empresa}. Acesse o link para responder a avaliação: ${link}`
}

function numeroWhatsapp(bruto: string) {
  const d = bruto.replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}

export default function FilaCandidaturas({ itens }: { itens: ItemFila[] }) {
  const [processando, setProcessando] = useState<string | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const [avisoLote, setAvisoLote] = useState<string | null>(null)
  // Candidaturas já aprovadas nesta visita, aguardando você copiar ou mandar o link.
  // Fica guardado aqui (e não só no item da fila) porque, assim que aprova, o item some
  // da fila — mas o link ainda precisa ser enviado.
  const [envios, setEnvios] = useState<Record<string, Envio>>({})
  const router = useRouter()
  const supabase = createClient()

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  // Aprova UM candidato: confere se sobra link no plano, só então desconta o crédito e
  // prepara o link para você copiar ou mandar pelo WhatsApp — nenhum dos dois é obrigatório.
  async function aprovar(item: ItemFila): Promise<'enviado' | 'sem_links' | 'erro'> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão expirada. Atualize a página e faça login novamente.')
      return 'erro'
    }

    const uso = await verificarEIncrementarUso(supabase, user.id, item.empresa_id)
    if (!uso) {
      setErro('Não foi possível verificar o seu plano agora. Tente de novo em instantes.')
      return 'erro'
    }
    if (!uso.permitido) {
      setErro(`Você atingiu o limite de ${uso.limite_total} links do seu plano. Faça upgrade na aba "Planos" para aprovar mais candidaturas.`)
      return 'sem_links'
    }

    const { error } = await supabase.from('candidatos').update({ status: 'Em análise' }).eq('id', item.id)
    if (error) {
      console.error('Erro ao aprovar candidatura:', error)
      setErro('Não foi possível aprovar essa candidatura. Tente de novo.')
      return 'erro'
    }

    const link = linkAvaliacao(item.token_link, item.id)
    setEnvios((atual) => ({
      ...atual,
      [item.id]: { nome: item.nome_completo, link, mensagem: mensagemPadrao(item, link) },
    }))

    return 'enviado'
  }

  async function aprovarUm(item: ItemFila) {
    setErro(null)
    setProcessando(item.id)
    await aprovar(item)
    setProcessando(null)
    router.refresh()
  }

  async function aprovarSelecionados() {
    setErro(null)
    setAvisoLote(null)
    const lista = itens.filter((i) => selecionados.has(i.id))
    if (lista.length === 0) return
    setProcessando('__lote__')

    let enviados = 0
    for (const item of lista) {
      const resultado = await aprovar(item)
      if (resultado === 'enviado') enviados++
      else if (resultado === 'sem_links') break // para o lote assim que o saldo acabar
    }

    setProcessando(null)
    setSelecionados(new Set())
    setAvisoLote(
      enviados === lista.length
        ? `${enviados} candidatura(s) aprovada(s). Copie ou envie o link de cada um abaixo.`
        : `${enviados} de ${lista.length} aprovada(s) — o saldo de links acabou no meio do caminho.`
    )
    router.refresh()
  }

  async function mudarStatus(id: string, status: 'Em espera' | 'Descartado') {
    setErro(null)
    setProcessando(id)
    await supabase.from('candidatos').update({ status }).eq('id', id)
    setProcessando(null)
    router.refresh()
  }

  function copiar(envio: Envio) {
    navigator.clipboard.writeText(envio.mensagem)
    alert('Mensagem copiada!')
  }

  function abrirWhatsapp(item: ItemFila | undefined, envio: Envio) {
    const numero = item ? numeroWhatsapp(item.whatsapp) : ''
    const url = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(envio.mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(envio.mensagem)}`
    window.open(url, '_blank')
  }

  function dispensarEnvio(id: string) {
    setEnvios((atual) => {
      const novo = { ...atual }
      delete novo[id]
      return novo
    })
  }

  const idsComEnvioPendente = Object.keys(envios)
  const itensDaFila = itens.filter((i) => !envios[i.id])

  if (itensDaFila.length === 0 && idsComEnvioPendente.length === 0) return null

  return (
    <div className="bg-white rounded-xl border p-4 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-sm">📥 Candidaturas recebidas</p>
        {itensDaFila.length > 0 && (
          <span className="text-xs text-gray-400">{itensDaFila.length} aguardando decisão</span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mb-3">
        Chegaram pelo currículo importado. Nenhum link foi enviado ainda — aprove para gerar o link da avaliação.
      </p>

      {erro && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 mb-3">{erro}</p>}
      {avisoLote && <p className="text-indigo-700 text-xs bg-indigo-50 rounded-lg px-3 py-2 mb-3">{avisoLote}</p>}

      {/* Aprovados agora: link pronto para copiar ou mandar pelo WhatsApp */}
      {idsComEnvioPendente.length > 0 && (
        <div className="space-y-2 mb-4">
          {idsComEnvioPendente.map((id) => {
            const envio = envios[id]
            const item = itens.find((i) => i.id === id)
            return (
              <div key={id} className="border border-green-200 bg-green-50/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-green-800">✓ {envio.nome} — aprovado</p>
                  <button onClick={() => dispensarEnvio(id)} className="text-[11px] text-gray-400 hover:text-gray-600">
                    Concluído, ocultar
                  </button>
                </div>
                <p className="text-xs text-gray-600 bg-white border rounded-lg px-2.5 py-1.5 break-all mb-2">
                  {envio.link}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirWhatsapp(item, envio)}
                    className="flex-1 bg-green-600 text-white text-xs font-medium rounded-lg py-2"
                  >
                    📱 Enviar por WhatsApp
                  </button>
                  <button
                    onClick={() => copiar(envio)}
                    className="flex-1 border text-xs font-medium rounded-lg py-2"
                  >
                    🔗 Copiar mensagem
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selecionados.size > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs text-gray-600">{selecionados.size} selecionado(s)</span>
          <button
            onClick={aprovarSelecionados}
            disabled={processando === '__lote__'}
            className="text-xs font-medium bg-indigo-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-60"
          >
            {processando === '__lote__' ? 'Aprovando...' : '✓ Aprovar selecionados'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {itensDaFila.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={selecionados.has(item.id)}
              onChange={() => alternarSelecao(item.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{item.nome_completo}</p>
                {item.status === 'Em espera' && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                    Guardado
                  </span>
                )}
                {item.destaque_ia && (
                  <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">
                    ✨ {item.destaque_ia}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{item.funcao} · {item.nome_empresa} · {item.whatsapp}</p>
              {(item.cidade || item.formacao) && (
                <p className="text-[11px] text-gray-400">{[item.cidade, item.formacao].filter(Boolean).join(' · ')}</p>
              )}
              {item.experiencia_resumo && (
                <p className="text-[11px] text-gray-400 mt-1">{item.experiencia_resumo}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => aprovarUm(item)}
                disabled={processando === item.id}
                className="text-xs font-medium bg-indigo-600 text-white rounded-lg px-3 py-1.5 whitespace-nowrap disabled:opacity-60"
              >
                {processando === item.id ? '...' : '✓ Aprovar'}
              </button>
              <div className="flex gap-1.5">
                {item.status !== 'Em espera' && (
                  <button
                    onClick={() => mudarStatus(item.id, 'Em espera')}
                    disabled={processando === item.id}
                    className="flex-1 text-[11px] border rounded-lg px-2 py-1"
                  >
                    Guardar
                  </button>
                )}
                <button
                  onClick={() => mudarStatus(item.id, 'Descartado')}
                  disabled={processando === item.id}
                  className="flex-1 text-[11px] border rounded-lg px-2 py-1 text-red-600"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
