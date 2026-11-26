import { describe, expect, test } from 'bun:test'
import { analyze, compareAnalyses, defaultScenario, measureProfile, optimize, portfolio } from './escudo'
import { parsePortfolioCsv, portfolioCsvColumns, serializePortfolioCsv, suggestHazardFromRainMm } from './portfolioIo'
import { chainForClient } from './supply'

describe('Capacidades MVP de dominio', () => {
  test('optimize acepta costos que no son múltiplos de 100 y respeta overrides manuales', () => {
    const candidates = [
      { id: 'c1', cost: 650, benefit: 2200 },
      { id: 'c2', cost: 420, benefit: 1500 },
      { id: 'c3', cost: 950, benefit: 2500 },
    ]
    const auto = optimize(candidates, 1100)
    expect(auto.cost).toBe(1070)
    expect(auto.ids.sort()).toEqual(['c1', 'c2'])

    const withExclude = optimize(candidates, 1100, { excludedIds: ['c1'] })
    expect(withExclude.ids).not.toContain('c1')
    expect(withExclude.ids).toEqual(['c3'])

    const withForce = optimize(candidates, 1100, { forcedIncludeIds: ['c3'] })
    expect(withForce.ids).toContain('c3')
    expect(withForce.overBudget).toBe(false)
  })

  test('analyze concilia beneficio y presupuesto con overrides manuales', () => {
    const sample = portfolio.slice(0, 8)
    const scenario = { ...defaultScenario, paths: 150 }
    const forcedId = sample[7]!.id
    const excludedId = sample[0]!.id
    const res = analyze(sample, scenario, 4000, {
      forcedIncludeIds: [forcedId],
      excludedIds: [excludedId],
    })
    expect(res.plan.ids).toContain(forcedId)
    expect(res.plan.ids).not.toContain(excludedId)
    expect(res.before.economicImpact - res.after.economicImpact).toBeCloseTo(res.plan.benefit, 4)
  })

  test('measureProfile diferencia sector y amenaza', () => {
    const agDrought = measureProfile('Agricultura', 'Sequía')
    const comFlood = measureProfile('Comercio', 'Inundación')
    expect(agDrought.label).not.toBe(comFlood.label)
    expect(agDrought.protection).toBeGreaterThan(comFlood.protection)
  })

  test('compareAnalyses calcula deltas exactos entre escenarios', () => {
    const sample = portfolio.slice(0, 10)
    const base = analyze(sample, { ...defaultScenario, intensity: 40, paths: 120 }, 3000)
    const severe = analyze(sample, { ...defaultScenario, intensity: 90, paths: 120 }, 3000)
    const diff = compareAnalyses(base, severe)
    expect(diff.economicImpactDelta).toBeGreaterThanOrEqual(0)
    expect(diff.expectedLossDelta).toBeGreaterThanOrEqual(0)
  })

  test('CSV exportado se vuelve a importar sin pérdidas ni errores', () => {
    const subset = portfolio.slice(0, 5).map((c, idx) => ({
      ...c,
      supplyOrigin: idx === 0 ? ('Ica' as const) : undefined,
    }))
    const csv = serializePortfolioCsv(subset)
    const parsed = parsePortfolioCsv(csv)
    expect(parsed.errors).toEqual([])
    expect(parsed.clients).toHaveLength(5)
    expect(chainForClient(parsed.clients[0]!).origin).toBe('Ica')
  })

  test('parsePortfolioCsv reporta errores específicos por columna o fila inválida', () => {
    expect(parsePortfolioCsv('').errors.length).toBeGreaterThan(0)
    const badHeader = 'id,name\n1,Test'
    expect(parsePortfolioCsv(badHeader).errors[0]).toContain('Faltan columnas')

    const header = portfolioCsvColumns.join(',')
    const badRow = `${header}\nC1,Negocio Uno,Trujillo,La Libertad,Comercio,Microempresa,999,-79.02,0.5,0.4,5000,2500,10000,8000,1200,0,500,0,1,24,700,Piura`
    const res = parsePortfolioCsv(badRow)
    expect(res.clients).toHaveLength(0)
    expect(res.errors[0]).toContain('coordenadas fuera de rango')
  })

  test('suggestHazardFromRainMm mapea precipitación a amenaza e intensidad', () => {
    expect(suggestHazardFromRainMm(5).intensity).toBe(15)
    expect(suggestHazardFromRainMm(25).hazard).toBe('Lluvias intensas')
    expect(suggestHazardFromRainMm(60).hazard).toBe('Inundación')
  })
})
