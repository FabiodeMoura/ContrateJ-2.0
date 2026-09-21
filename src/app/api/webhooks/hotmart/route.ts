import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ATENÇÃO — leia antes de configurar no Hotmart:
//
// 1. No Hotmart, crie 3 produtos (Plano 79, Plano 99, Links avulsos) com
//    os preços combinados (79,90 / 99,90 / 3,00).
// 2. Em cada produto, vá em Ferramentas > Webhook e cadastre esta URL:
//    https://contrateja.app.br/api/webhooks/hotmart
// 3. Copie o "Hottok" (token de segurança) que o Hotmart gera e cole na
//    variável de ambiente HOTMART_HOTTOK no Render.
// 4. Para o sistema saber qual plano é qual, defina no Render:
//    - Se os planos ficarem em produtos separados: o ID de cada produto
//      (HOTMART_ID_PLANO_79, HOTMART_ID_PLANO_99).
//    - Se os dois planos ficarem no MESMO produto: defina HOTMART_ID_PRODUTO_ASSINATURA
//      com o ID do produto. Cada plano é reconhecido pelo nome dele no Hotmart:
//      o nome precisa conter "79,90" (Plano 79) ou "99,90" (Plano 99).
//      Alternativa: o código de cada oferta (HOTMART_OFERTA_PLANO_79 / _99), que é o
//      trecho depois de "off=" no link de pagamento.
//    - Links avulsos (produto de pagamento único): HOTMART_OFERTAS_AVULSOS, no formato
//      "codigo:5,codigo:10,codigo:20" (código da oferta : quantidade de links) — ou HOTMART_ID_LINKS_AVULSOS
//    Eventos tratados: compra aprovada/completa (libera), cancelamento de assinatura (mantém o
//    acesso até o fim do período pago) e reembolso/chargeback (encerra na hora).
// 5. HOTMART_SEGREDO_INTERNO (Render): senha entre este site e o banco de dados.
//    NUNCA escreva esse valor no código nem no GitHub. Se precisar trocar, altere
//    no Render e na função processar_compra_hotmart do Supabase ao mesmo tempo.
// 6. Teste usando o botão "Simular" que o Hotmart oferece na tela do
//    webhook, e me avise se o formato dos dados vier diferente do
//    esperado aqui — é comum precisar de um ajuste fino depois do
//    primeiro teste real.

// Compara textos em tempo constante (evita descobrir a senha pelo tempo de resposta)
function iguais(a: string, b: string) {
  const ta = new TextEncoder().encode(a)
  const tb = new TextEncoder().encode(b)
  let diferenca = ta.length ^ tb.length
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    diferenca |= (ta[i] ?? 0) ^ (tb[i] ?? 0)
  }
  return diferenca === 0
}

// Ofertas de links avulsos, no formato "codigo:quantidade,codigo:quantidade" (variável HOTMART_OFERTAS_AVULSOS).
function ofertasAvulsas(): Record<string, number> {
  const resultado: Record<string, number> = {}
  for (const par of (process.env.HOTMART_OFERTAS_AVULSOS ?? '').split(',')) {
    const [codigo, qtd] = par.split(':').map((x) => x.trim())
    const n = Number(qtd)
    if (codigo && Number.isFinite(n) && n > 0) resultado[codigo] = n
  }
  return resultado
}

// Converte a data que o Hotmart manda (milissegundos ou segundos) para texto ISO
function paraDataIso(valor: unknown): string | null {
  const n = Number(valor)
  if (!valor || !Number.isFinite(n) || n <= 0) return null
  const d = new Date(n > 1e12 ? n : n * 1000)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Eventos do Hotmart que o site trata. Os demais só são confirmados (respondem "ok").
const EVENTOS_COMPRA = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'] // libera plano / links
const EVENTOS_CANCELAMENTO = ['SUBSCRIPTION_CANCELLATION'] // cancelou: acesso vai até o fim do período pago
const EVENTOS_ESTORNO = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK'] // reembolso/chargeback: encerra na hora

export async function POST(request: NextRequest) {
  const hottokRecebido = request.headers.get('x-hotmart-hottok') ?? ''
  const hottokEsperado = process.env.HOTMART_HOTTOK
  const segredoInterno = process.env.HOTMART_SEGREDO_INTERNO

  // Sem essas duas variáveis configuradas o webhook não funciona (recusa tudo)
  if (!hottokEsperado || !segredoInterno) {
    console.error('Webhook do Hotmart sem configuração: defina HOTMART_HOTTOK e HOTMART_SEGREDO_INTERNO no Render.')
    return NextResponse.json({ erro: 'Webhook não configurado' }, { status: 503 })
  }

  if (!iguais(hottokRecebido, hottokEsperado)) {
    console.error('Webhook do Hotmart recusado: Hottok inválido (confira HOTMART_HOTTOK no Render).')
    return NextResponse.json({ erro: 'Hottok inválido' }, { status: 401 })
  }

  let corpo: any
  try {
    corpo = await request.json()
  } catch {
    // Responde 2xx para o Hotmart não desativar o webhook por causa de um aviso mal formado
    console.error('Webhook do Hotmart: o aviso não veio em formato JSON.')
    return NextResponse.json({ ok: false, erro: 'corpo inválido' })
  }

  // Deixa no log todo aviso recebido (sem dados pessoais), para dar para acompanhar pelo Render
  console.log('Webhook do Hotmart recebido:', {
    evento: corpo?.event,
    produto: corpo?.data?.product?.id,
    oferta: corpo?.data?.purchase?.offer?.code,
    plano: corpo?.data?.subscription?.plan?.name,
  })

  const evento: string = corpo?.event ?? ''
  const dados = corpo?.data ?? {}
  const eCompra = EVENTOS_COMPRA.includes(evento)
  const eCancelamento = EVENTOS_CANCELAMENTO.includes(evento)
  const eEstorno = EVENTOS_ESTORNO.includes(evento)

  if (!eCompra && !eCancelamento && !eEstorno) {
    // Outros avisos (boleto emitido, atraso, etc.): só confirma o recebimento
    return NextResponse.json({ ok: true, ignorado: evento })
  }

  const email: string | undefined = dados.buyer?.email ?? dados.subscriber?.email ?? dados.user?.email
  const produtoId = String(dados.product?.id ?? '')
  const valorTotal = dados.purchase?.price?.value ?? dados.purchase?.full_price?.value
  // Identifica a transação (para não contar duas vezes o mesmo aviso)
  const transacao = dados.purchase?.transaction ? String(dados.purchase.transaction) : null
  const renovacao = Number(dados.purchase?.recurrence_number ?? 1) > 1
  const codigoOferta = dados.purchase?.offer?.code ? String(dados.purchase.offer.code) : ''
  const nomePlano = dados.subscription?.plan?.name ? String(dados.subscription.plan.name) : ''
  // Código do assinante: identifica a mesma assinatura em todas as cobranças
  const chaveAssinatura = String(dados.subscription?.subscriber?.code ?? dados.subscriber?.code ?? '') || null

  if (!email) {
    console.error(`Webhook do Hotmart (${evento}): e-mail do comprador não encontrado no aviso.`)
    return NextResponse.json({ ok: false, erro: 'e-mail não encontrado' })
  }

  let tipo: 'plano_79' | 'plano_99' | 'links_avulsos' | null = null
  let quantidade = 0

  if (codigoOferta && codigoOferta === process.env.HOTMART_OFERTA_PLANO_79) {
    tipo = 'plano_79'
  } else if (codigoOferta && codigoOferta === process.env.HOTMART_OFERTA_PLANO_99) {
    tipo = 'plano_99'
  } else if (
    process.env.HOTMART_ID_PRODUTO_ASSINATURA &&
    produtoId === process.env.HOTMART_ID_PRODUTO_ASSINATURA &&
    nomePlano.includes('79,90')
  ) {
    tipo = 'plano_79'
  } else if (
    process.env.HOTMART_ID_PRODUTO_ASSINATURA &&
    produtoId === process.env.HOTMART_ID_PRODUTO_ASSINATURA &&
    nomePlano.includes('99,90')
  ) {
    tipo = 'plano_99'
  } else if (produtoId && produtoId === process.env.HOTMART_ID_PLANO_79) {
    tipo = 'plano_79'
  } else if (produtoId && produtoId === process.env.HOTMART_ID_PLANO_99) {
    tipo = 'plano_99'
  } else if (codigoOferta && ofertasAvulsas()[codigoOferta]) {
    tipo = 'links_avulsos'
    quantidade = ofertasAvulsas()[codigoOferta]
  } else if (produtoId && produtoId === process.env.HOTMART_ID_LINKS_AVULSOS) {
    tipo = 'links_avulsos'
    // Cada link avulso custa R$ 3,00 — estima a quantidade pelo valor pago.
    quantidade = valorTotal ? Math.max(1, Math.round(valorTotal / 3)) : 1
  }

  if (!tipo) {
    // Responde 2xx de propósito: se o Hotmart receber erro, ele desativa sozinho a configuração do
    // webhook. O aviso fica registrado no log do Render.
    console.error(`Webhook do Hotmart (${evento}): compra não reconhecida (confira HOTMART_ID_* e HOTMART_OFERTA_* no Render).`, {
      produtoId,
      codigoOferta,
      nomePlano,
    })
    return NextResponse.json({ ok: true, ignorado: 'produto ou oferta não reconhecidos' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let resposta
  if (eCompra) {
    resposta = await supabase.rpc('processar_compra_hotmart', {
      p_email: email,
      p_tipo: tipo,
      p_quantidade: quantidade,
      p_segredo: segredoInterno,
      p_transacao: transacao,
      p_renovacao: renovacao,
      p_chave: chaveAssinatura,
    })
  } else if (eCancelamento) {
    // date_next_charge = fim do período já pago; se não vier, o banco assume 32 dias após o último pagamento
    const fimDoPeriodo = paraDataIso(dados.date_next_charge ?? dados.subscription?.date_next_charge ?? dados.purchase?.date_next_charge)
    resposta = await supabase.rpc('cancelar_assinatura_hotmart', {
      p_email: email,
      p_tipo: tipo,
      p_segredo: segredoInterno,
      p_chave: chaveAssinatura,
      p_acesso_ate: fimDoPeriodo,
    })
  } else {
    resposta = await supabase.rpc('encerrar_assinatura_hotmart', {
      p_email: email,
      p_tipo: tipo,
      p_segredo: segredoInterno,
      p_chave: chaveAssinatura,
      p_quantidade: quantidade,
      p_transacao: transacao,
    })
  }

  const { error } = resposta

  if (error) {
    console.error(`Erro ao processar ${evento} do Hotmart:`, error)
    // Problemas que não se resolvem com nova tentativa (comprador sem conta com esse e-mail, links
    // avulsos sem plano pago): responde 2xx para o Hotmart não desativar o webhook. Confira no log do Render.
    if (/não encontrado|exige um plano pago/i.test(error.message)) {
      return NextResponse.json({ ok: false, erro: error.message })
    }
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
