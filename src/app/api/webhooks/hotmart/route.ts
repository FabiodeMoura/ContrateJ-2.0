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
// 4. Para o sistema saber qual produto é qual, defina no Render as
//    variáveis de ambiente com o ID de cada produto no Hotmart:
//    HOTMART_ID_PLANO_79, HOTMART_ID_PLANO_99, HOTMART_ID_LINKS_AVULSOS
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
    return NextResponse.json({ erro: 'Hottok inválido' }, { status: 401 })
  }

  const corpo = await request.json()

  const evento = corpo?.event
  const email = corpo?.data?.buyer?.email
  const produtoId = String(corpo?.data?.product?.id ?? '')
  const valorTotal = corpo?.data?.purchase?.price?.value ?? corpo?.data?.purchase?.full_price?.value
  // Identifica a transação (para não contar duas vezes o mesmo aviso) e se é
  // renovação mensal (recurrence_number > 1), que não libera empresa nova.
  const transacao = corpo?.data?.purchase?.transaction ? String(corpo.data.purchase.transaction) : null
  const renovacao = Number(corpo?.data?.purchase?.recurrence_number ?? 1) > 1

  if (evento !== 'PURCHASE_APPROVED' && evento !== 'PURCHASE_COMPLETE') {
    // Ignora cancelamentos/reembolsos por enquanto — só confirma o recebimento
    return NextResponse.json({ ok: true, ignorado: evento })
  }

  if (!email) {
    return NextResponse.json({ erro: 'E-mail do comprador não encontrado no payload' }, { status: 400 })
  }

  let tipo: 'plano_79' | 'plano_99' | 'links_avulsos' | null = null
  let quantidade = 0

  if (produtoId === process.env.HOTMART_ID_PLANO_79) {
    tipo = 'plano_79'
  } else if (produtoId === process.env.HOTMART_ID_PLANO_99) {
    tipo = 'plano_99'
  } else if (produtoId === process.env.HOTMART_ID_LINKS_AVULSOS) {
    tipo = 'links_avulsos'
    // Cada link avulso custa R$ 3,00 — estima a quantidade pelo valor pago.
    // Ajuste aqui se o Hotmart mandar a quantidade em outro campo.
    quantidade = valorTotal ? Math.max(1, Math.round(valorTotal / 3)) : 1
  }

  if (!tipo) {
    // Responde 2xx de propósito: se o Hotmart receber erro, ele desativa sozinho a configuração do
    // webhook. O aviso fica registrado no log do Render.
    console.error(`Webhook do Hotmart: produto ${produtoId} não reconhecido (confira HOTMART_ID_* no Render).`)
    return NextResponse.json({ ok: true, ignorado: `produto ${produtoId} não reconhecido` })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.rpc('processar_compra_hotmart', {
    p_email: email,
    p_tipo: tipo,
    p_quantidade: quantidade,
    p_segredo: segredoInterno,
    p_transacao: transacao,
    p_renovacao: renovacao,
  })

  if (error) {
    console.error('Erro ao processar compra do Hotmart:', error)
    // Problemas que não se resolvem com nova tentativa (comprador sem conta com esse e-mail, links
    // avulsos sem plano pago): responde 2xx para o Hotmart não desativar o webhook. Confira no log do Render.
    if (/não encontrado|exige um plano pago/i.test(error.message)) {
      return NextResponse.json({ ok: false, erro: error.message })
    }
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
