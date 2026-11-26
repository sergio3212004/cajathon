import { describe, expect, test } from 'bun:test'
import { analyze, defaultScenario, hazards, histogram, optimize, portfolio, posterior, quantile, random, scenarioFingerprint, segments, sensitivity, simulateClimate, stressPD } from './escudo'

const scenario = { ...defaultScenario, paths: 200 }
const clients = portfolio.slice(0, 12)
describe('Cartera sintética y reproducibilidad', () => {
  test('60 clientes únicos y cinco segmentos, coordenadas finitas', () => {
    expect(portfolio).toHaveLength(60)
    expect(new Set(portfolio.map(c => c.id)).size).toBe(60)
    expect(new Set(portfolio.map(c => c.segment)).size).toBe(segments.length)
    expect(portfolio.every(c => Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.balance > 0 && c.payment > 0)).toBe(true)
  })
  test('PRNG reproduce la misma secuencia', () => {
    const a = random(2026), b = random(2026)
    expect(Array.from({ length: 50 }, a)).toEqual(Array.from({ length: 50 }, b))
  })
  test('actualización conjugada Beta y observaciones inválidas', () => {
    expect(posterior(0, 0).mean).toBe(.2)
    expect(posterior(10, 24).mean).toBeCloseTo(12 / 34)
    expect(posterior(12, 24).mean).toBeGreaterThan(posterior(2, 24).mean)
    expect(() => posterior(3, 2)).toThrow()
  })
  test('cuantiles y entradas vacías', () => {
    expect(quantile([0, 10, 20], .5)).toBe(10)
    expect(quantile([], .95)).toBe(0)
    expect(histogram([])).toEqual([])
  })
})
describe('Motor climático-crediticio', () => {
  test('idéntica semilla produce idénticas pérdidas', () => {
    expect(simulateClimate(clients, scenario)).toEqual(simulateClimate(clients, scenario))
  })
  test('intensidad cero elimina daño e incremento de pérdida, no elimina el riesgo base', () => {
    const r = simulateClimate(clients, { ...scenario, intensity: 0 })
    expect(r.damage).toBe(0)
    expect(r.expectedLoss).toBeCloseTo(r.baseLoss, 6)
    expect(r.baseLoss).toBeGreaterThan(0)
  })
  test('mayor intensidad no reduce pérdidas en comparaciones emparejadas', () => {
    const low = simulateClimate(clients, { ...scenario, intensity: 30 })
    const high = simulateClimate(clients, { ...scenario, intensity: 95 })
    expect(high.damage).toBeGreaterThanOrEqual(low.damage)
    expect(high.expectedLoss).toBeGreaterThanOrEqual(low.expectedLoss)
  })
  test('medidas reducen daño y pérdida bajo el mismo choque', () => {
    const before = simulateClimate(clients, scenario)
    const after = simulateClimate(clients, scenario, clients.map(c => c.id))
    expect(after.damage).toBeLessThan(before.damage)
    expect(after.expectedLoss).toBeLessThanOrEqual(before.expectedLoss)
    expect(after.baseLoss).toBeCloseTo(before.baseLoss, 8)
  })
  test('sumas de clientes concilian con cartera y promedio de trayectorias', () => {
    const r = simulateClimate(clients, scenario)
    expect(r.clients.reduce((s, c) => s + c.expectedLoss, 0)).toBeCloseTo(r.expectedLoss, 6)
    expect(r.losses.reduce((s, v) => s + v, 0) / scenario.paths).toBeCloseTo(r.expectedLoss, 6)
    expect(r.clients.every(c => c.shortfall >= 0 && c.shortfall <= 1 && c.pd >= 0 && c.pd <= 1)).toBe(true)
    expect(r.p10).toBeLessThanOrEqual(r.p90)
    expect(r.es95).toBeGreaterThanOrEqual(r.var95)
  })
  test('LGD cero elimina pérdida crediticia, no el daño del negocio', () => {
    const r = simulateClimate(clients, { ...scenario, lgd: 0 })
    expect(r.expectedLoss).toBe(0)
    expect(r.damage).toBeGreaterThan(0)
  })
  test('cada amenaza tiene sensibilidad sectorial explícita y resultados finitos', () => {
    expect(sensitivity('Sequía', 'Agricultura')).toBeGreaterThan(sensitivity('Sequía', 'Comercio'))
    for (const hazard of hazards) expect(Number.isFinite(simulateClimate(clients.slice(0, 2), { ...scenario, hazard }).expectedLoss)).toBe(true)
  })
  test('escenario y datos vacíos se manejan sin NaN', () => {
    expect(simulateClimate([], scenario).expectedLoss).toBe(0)
    expect(simulateClimate([], scenario).p90).toBe(0)
    expect(() => simulateClimate(clients, { ...scenario, paths: 0 })).toThrow()
    expect(() => simulateClimate(clients, { ...scenario, intensity: NaN })).toThrow()
    expect(() => simulateClimate(clients, { ...scenario, lgd: 2 })).toThrow()
  })
  test('histograma conserva todas las trayectorias, incluso valores iguales', () => {
    for (const values of [[1, 1, 1], [0, 2, 7, 100]]) expect(histogram(values).reduce((s, b) => s + b.count, 0)).toBe(values.length)
  })
  test('logit es explicable y no usa geografía ni segmento como predictores directos', () => {
    const c = clients[0]!
    const result = stressPD(c, .8, .1)
    expect(result.features.reduce((s, f) => s + f.contribution, 0)).toBeCloseTo(Math.log(result.pd / (1 - result.pd)))
    expect(stressPD({ ...c, district: 'Otra zona', segment: 'Otro' }, .8, .1).pd).toBe(result.pd)
    expect(stressPD(c, .3, .3).pd).toBeGreaterThan(result.pd)
  })
})
describe('Planificador y agentes locales', () => {
  test('la huella incluye versión y clientes para no reutilizar revisiones de otra cartera', () => {
    expect(scenarioFingerprint(clients, scenario, 1000)).not.toBe(scenarioFingerprint(clients.slice(0, 2), scenario, 1000))
    expect(scenarioFingerprint(clients, scenario, 1000)).not.toBe(scenarioFingerprint(clients, { ...scenario, intensity: 0 }, 1000))
  })
  test('mochila encuentra óptimo y respeta presupuesto, sin duplicar', () => {
    const r = optimize([{ id: 'a', cost: 200, benefit: 3 }, { id: 'b', cost: 300, benefit: 4 }, { id: 'c', cost: 400, benefit: 5 }], 600)
    expect(r.cost).toBe(600)
    expect(r.benefit).toBe(8)
    expect(r.ids.sort()).toEqual(['a', 'c'])
  })
  test('sin presupuesto o sin beneficio no hay intervención', () => {
    expect(optimize([{ id: 'a', cost: 200, benefit: 10 }], 0).ids).toEqual([])
    expect(optimize([{ id: 'a', cost: 200, benefit: -1 }], 1000).ids).toEqual([])
    expect(() => optimize([], -10)).toThrow()
  })
  test('salida de agentes es trazable a cálculos reales y efectos conciliables', () => {
    const r = analyze(clients, scenario, 3000)
    expect(r.plan.cost).toBeLessThanOrEqual(3000)
    expect(new Set(r.plan.ids).size).toBe(r.plan.ids.length)
    expect(r.before.damage - r.after.damage).toBeCloseTo(r.plan.benefit, 5)
    expect(r.trace).toHaveLength(4)
    expect(r.trace.at(-1)!.evidence).toContain('sin LLM')
  })
})
