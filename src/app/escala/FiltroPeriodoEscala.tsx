'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MAX_DIAS_INTERVALO, hojeIso, type PeriodoEscala } from '@/lib/escala'

// Filtro de período da escala: mês, semana ou intervalo de datas (personalizado).
export default function FiltroPeriodoEscala({ periodo }: { periodo: PeriodoEscala }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hoje = hojeIso()
  const inicio = periodo.dias[0]
  const fim = periodo.dias[periodo.dias.length - 1]

  function aplicar(novos: Record<string, string>) {
    const params = new URLSearchParams()
    const empresa = searchParams.get('empresa')
    if (empresa) params.set('empresa', empresa)
    Object.entries(novos).forEach(([chave, valor]) => params.set(chave, valor))
    router.push(`/escala?${params.toString()}`)
  }

  function mudarTipo(tipo: string) {
    if (tipo === 'mes') aplicar({ p: 'mes', m: hoje.slice(0, 7) })
    else if (tipo === 'semana') aplicar({ p: 'semana', d: hoje })
    else aplicar({ p: 'intervalo', de: inicio, ate: fim })
  }

  const campo = 'border rounded-lg px-3 py-2 text-sm bg-white'

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500 hidden sm:inline">📅 Período</span>
      <select value={periodo.tipo} onChange={(e) => mudarTipo(e.target.value)} className={campo}>
        <option value="mes">Mês</option>
        <option value="semana">Semana</option>
        <option value="intervalo">Personalizado</option>
      </select>
      {periodo.tipo === 'mes' && (
        <input type="month" className={campo} value={inicio.slice(0, 7)}
          onChange={(e) => e.target.value && aplicar({ p: 'mes', m: e.target.value })} />
      )}
      {periodo.tipo === 'semana' && (
        // Escolhe qualquer dia e a escala mostra a semana inteira (segunda a domingo).
        <input type="date" className={campo} value={inicio}
          onChange={(e) => e.target.value && aplicar({ p: 'semana', d: e.target.value })} />
      )}
      {periodo.tipo === 'intervalo' && (
        <>
          <input type="date" className={campo} value={inicio} aria-label="Data inicial"
            onChange={(e) => e.target.value && aplicar({ p: 'intervalo', de: e.target.value, ate: e.target.value > fim ? e.target.value : fim })} />
          <span className="text-xs text-gray-500">até</span>
          <input type="date" className={campo} value={fim} min={inicio} aria-label="Data final"
            title={`Até ${MAX_DIAS_INTERVALO} dias`}
            onChange={(e) => e.target.value && aplicar({ p: 'intervalo', de: inicio, ate: e.target.value })} />
        </>
      )}
    </div>
  )
}
