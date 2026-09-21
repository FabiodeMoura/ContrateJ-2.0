import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import { ErroCurriculo, TAMANHO_MAXIMO, extrairDadosDoCurriculo } from '@/lib/extrairCurriculo'

export const runtime = 'nodejs'

// Limite simples por usuário para o custo da IA não sair do controle (30 leituras por hora)
const usos = new Map<string, number[]>()
const LIMITE_POR_HORA = 30

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Faça login para importar currículos.' }, { status: 401 })

  const chave = process.env.ANTHROPIC_API_KEY
  if (!chave) {
    console.error('Leitura de currículo sem configuração: defina ANTHROPIC_API_KEY no Render.')
    return NextResponse.json(
      { erro: 'A leitura automática de currículos ainda não foi ativada neste sistema.' },
      { status: 503 }
    )
  }

  const agora = Date.now()
  const recentes = (usos.get(user.id) ?? []).filter((t) => agora - t < 3600 * 1000)
  if (recentes.length >= LIMITE_POR_HORA) {
    return NextResponse.json({ erro: 'Muitas leituras seguidas. Tente de novo em alguns minutos.' }, { status: 429 })
  }

  let formulario: FormData
  try {
    formulario = await request.formData()
  } catch {
    return NextResponse.json({ erro: 'Não recebi o arquivo. Tente de novo.' }, { status: 400 })
  }
  const arquivo = formulario.get('arquivo')
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha um arquivo.' }, { status: 400 })
  if (arquivo.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: 'O arquivo passa de 5 MB. Envie um menor.' }, { status: 413 })
  }
  if (arquivo.size === 0) return NextResponse.json({ erro: 'O arquivo está vazio.' }, { status: 400 })

  try {
    recentes.push(agora)
    usos.set(user.id, recentes)
    const dados = await extrairDadosDoCurriculo(
      Buffer.from(await arquivo.arrayBuffer()),
      arquivo.name,
      arquivo.type,
      chave
    )
    // O arquivo não é guardado: só os dados extraídos voltam para preencher o formulário.
    return NextResponse.json({ dados })
  } catch (e) {
    if (e instanceof ErroCurriculo) return NextResponse.json({ erro: e.message }, { status: e.status })
    console.error('Erro inesperado ao ler currículo:', e)
    return NextResponse.json({ erro: 'Não foi possível ler o currículo.' }, { status: 500 })
  }
}
