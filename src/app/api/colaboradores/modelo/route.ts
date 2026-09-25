import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import { montarModeloColaboradores } from '@/lib/modeloColaboradores'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Baixa a planilha-modelo de colaboradores já com as empresas da conta na lista de escolha.
export async function GET() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Faça login para baixar o modelo.' }, { status: 401 })

  const { data: empresas } = await supabase
    .from('minhas_empresas')
    .select('nome_fantasia')
    .order('nome_fantasia', { ascending: true })

  let arquivo: Buffer
  try {
    arquivo = montarModeloColaboradores((empresas ?? []).map((e) => e.nome_fantasia ?? ''))
  } catch (erro) {
    console.error('Erro ao montar o modelo de colaboradores:', erro)
    return NextResponse.json({ erro: 'Não foi possível gerar o modelo agora. Tente de novo.' }, { status: 500 })
  }

  const corpo = arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength) as ArrayBuffer
  return new NextResponse(corpo, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="contrateja-modelo-colaboradores.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
