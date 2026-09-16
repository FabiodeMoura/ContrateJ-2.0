import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ATENÇÃO — leia antes de configurar no Hotmart:
//
// 1. No Hotmart, crie 3 produtos (Plano 79, Plano 99, Links avulsos) com
//    os preços combinados (79,90 / 99,90 / 2,00).
// 2. Em cada produto, vá em Ferramentas > Webhook e cadastre esta URL:
//    https://contrateja.onrender.com/api/webhooks/hotmart
// 3. Copie o "Hottok" (token de segurança) que o Hotmart gera e cole na
//    variável de ambiente HOTMART_HOTTOK no Render.
// 4. Para o sistema saber qual produto é qual, defina no Render as
//    variáveis de ambiente com o ID de cada produto no Hotmart:
//    HOTMART_ID_PLANO_79, HOTMART_ID_PLANO_99, HOTMART_ID_LINKS_AVULSOS
// 5. Teste usando o botão "Simular" que o Hotmart oferece na tela do
//    webhook, e me avise se o formato dos dados vier diferente do
//    esperado aqui — é comum precisar de um ajuste fino depois do
//    primeiro teste real.

const SEGREDO_INTERNO = '71beb54b0cefa79c30320718ffbd80e1f64bbafb7d8dadf4'

export async function POST(request: NextRequest) {
  const hottokRecebido = request.headers.get('x-hotmart-hottok')
  const hottokEsperado = process.env.HOTMART_HOTTOK

  if (hottokEsperado && hottokRecebido !== hottokEsperado) {
    return NextResponse.json({ erro: 'Hottok inválido' }, { status: 401 })
  }

  const corpo = await request.json()

  const evento = corpo?.event
  const email = corpo?.data?.buyer?.email
  const produtoId = String(corpo?.data?.product?.id ?? '')
  const valorTotal = corpo?.data?.purchase?.price?.value ?? corpo?.data?.purchase?.full_price?.value

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
    // Cada link avulso custa R$ 2,00 — estima a quantidade pelo valor pago.
    // Ajuste aqui se o Hotmart mandar a quantidade em outro campo.
    quantidade = valorTotal ? Math.max(1, Math.round(valorTotal / 2)) : 1
  }

  if (!tipo) {
    return NextResponse.json({ erro: `Produto ${produtoId} não reconhecido` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.rpc('processar_compra_hotmart', {
    p_email: email,
    p_tipo: tipo,
    p_quantidade: quantidade,
    p_segredo: SEGREDO_INTERNO,
  })

  if (error) {
    console.error('Erro ao processar compra do Hotmart:', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
