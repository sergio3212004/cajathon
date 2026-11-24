import { describe, expect, test } from 'bun:test'
import { businesses } from './data'
import { assess, simulate, type Scenario } from './risk'
const scenario: Scenario = { hazard: 'Lluvias intensas', intensity: 85, horizon: 72 }
const business = businesses[0]!
describe('Pérdida esperada explicable', () => {
  test('la pérdida corresponde a valor × probabilidad × vulnerabilidad', () => {
    const result = assess(business, scenario)
    expect(result.loss).toBeCloseTo(business.assets.reduce((s, a) => s + a.value * business.exposure * .85 * a.vulnerability, 0), 6)
    expect(result.loss).toBeLessThan(result.total)
  })
  test('proteger un activo reduce la pérdida sin cambiar su valor', () => {
    const base = assess(business, scenario)
    const protectedResult = assess(business, scenario, [business.assets[0]!.id])
    expect(protectedResult.loss).toBeLessThan(base.loss)
    expect(protectedResult.total).toBe(base.total)
  })
  test('a menor intensidad, menor pérdida', () => {
    expect(assess(business, { ...scenario, intensity: 20 }).loss).toBeLessThan(assess(business, scenario).loss)
  })
  test('sequía afecta de forma distinta a agricultura y servicios', () => {
    const drought: Scenario = { ...scenario, hazard: 'Sequía' }
    expect(assess({ ...business, sector: 'Agricultura' }, drought).loss).toBeGreaterThan(assess({ ...business, sector: 'Servicios' }, drought).loss)
  })
})
describe('Cuotas adaptables', () => {
  for (const months of [6, 12, 18]) {
    for (const tea of [0, 26, 60]) {
      test(`amortiza el capital en ${months} meses con TEA ${tea}%`, () => {
        const { schedule, rate } = simulate(business, 30000, tea, months, 30)
        const presentValue = schedule.reduce((sum, r) => sum + r.flexible / (1 + rate) ** r.month, 0)
        expect(presentValue).toBeCloseTo(business.principal, 5)
        expect(schedule.at(-1)!.balance).toBeCloseTo(0, 5)
        expect(schedule.every(r => Number.isFinite(r.flexible))).toBe(true)
      })
    }
  }
  test('un shock de ingresos puede impedir proponer el cronograma', () => {
    expect(simulate(business, 40000, 26, 6, 80).feasible).toBe(false)
  })
  test('si es viable cumple capacidad e intereses en todos los meses', () => {
    const result = simulate(business, 20000, 26, 12, 10)
    expect(result.feasible).toBe(true)
    expect(result.schedule.every(r => r.flexible <= r.capacity && r.flexible >= r.interest)).toBe(true)
  })
})
