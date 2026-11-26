import { describe, expect, test } from 'bun:test'
import { analyze, defaultScenario, portfolio, scenarioFingerprint, simulateClimate } from './escudo'
import { chainForClient, defaultSupply, simulateInventory, supplyImpact, supplyPresets, validateSupply } from './supply'
import { transitionTask, type TaskStage } from './workflow'

const scenario = { ...defaultScenario, paths: 250, impactMode: 'indirect' as const,
  intensity: 90, supply: { ...defaultSupply, outageDays: 22, inventoryDays: 2, substitution: 0 } }
const remote = portfolio.filter(c => c.exposure === 0)
const epsilon = 1e-8

describe('Inventario y propagación interregional sintética', () => {
  test('cada balance diario conserva unidades y no crea inventario negativo', () => {
    const rows = simulateInventory({ outageDays: 14.5, inventoryDays: 3, substitution: .2, dependency: .8 })
    expect(rows).toHaveLength(30)
    for (const r of rows) {
      expect(r.opening + r.delivered - r.served).toBeCloseTo(r.closing, 10)
      expect(r.served + r.unmet).toBeCloseTo(1, 10)
      expect(r.closing).toBeGreaterThanOrEqual(0)
      expect(r.delivered).toBeGreaterThanOrEqual(0)
    }
  })
  test('la fórmula rápida equivale al inventario diario, incluso con interrupción fraccional', () => {
    const client = portfolio.find(c => chainForClient(c).origin === 'Piura')!
    for (const outageDays of [0, 3.75, 12, 30]) for (const inventoryDays of [0, 2, 15]) for (const substitution of [0, 40, 100]) {
      const supply = { ...defaultSupply, outageDays, inventoryDays, substitution }
      const fast = supplyImpact(client, supply, 100, 1, true, false)
      const daily = simulateInventory({ outageDays, inventoryDays, substitution: substitution / 100, dependency: chainForClient(client).dependency })
      expect(fast.unmetDays).toBeCloseTo(daily.reduce((s, d) => s + d.unmet, 0), 9)
    }
  })
  test('la reserva protege, sustitución completa elimina faltantes y la entrega se recupera', () => {
    const input = { outageDays: 15, inventoryDays: 0, substitution: 0, dependency: 1 }
    expect(simulateInventory(input).reduce((s, d) => s + d.unmet, 0)).toBe(15)
    expect(simulateInventory({ ...input, inventoryDays: 15 }).every(d => d.unmet === 0)).toBe(true)
    expect(simulateInventory({ ...input, substitution: 1 }).every(d => d.unmet === 0)).toBe(true)
    expect(simulateInventory(input).slice(15).every(d => d.delivered === 1 && d.unmet === 0)).toBe(true)
  })
  test('rechaza parámetros fuera de dominio', () => {
    expect(() => simulateInventory({ outageDays: -1, inventoryDays: 2, substitution: 0, dependency: 1 })).toThrow()
    expect(() => simulateInventory({ outageDays: 1, inventoryDays: 2, substitution: 2, dependency: 1 })).toThrow()
    expect(() => validateSupply({ ...defaultSupply, inventoryDays: NaN })).toThrow()
  })
  test('negocios distantes pierden margen y capacidad de pago sin daño físico', () => {
    expect(new Set(remote.map(c => c.region)).size).toBe(3)
    const result = simulateClimate(remote, scenario)
    expect(result.damage).toBe(0)
    expect(result.indirectLoss).toBeGreaterThan(0)
    expect(result.expectedLoss).toBeGreaterThan(result.baseLoss)
    expect(result.clients.some(r => r.unmetDays > 0 && r.shortfall > 0)).toBe(true)
    expect(result.clients.filter(r => chainForClient(r.client).origin !== 'Piura').every(r => r.indirectLoss === 0)).toBe(true)
  })
  test('todos los dependientes comparten el mismo choque upstream', () => {
    const rows = simulateClimate(portfolio, scenario).clients.filter(r => chainForClient(r.client).origin === 'Piura')
    expect(rows.length).toBeGreaterThan(1)
    expect(rows.every(r => Math.abs(r.supplyDays - rows[0]!.supplyDays) < epsilon)).toBe(true)
    expect(rows.every(r => Math.abs(r.unmetDays - rows[0]!.unmetDays) < epsilon)).toBe(true)
  })
  test('el resultado individual se conserva al filtrar cartera', () => {
    const c = remote.find(c => chainForClient(c).origin === 'Piura')!
    const all = simulateClimate(portfolio, scenario).clients.find(r => r.client.id === c.id)!
    expect(simulateClimate([c], scenario).clients[0]).toEqual(all)
    const combined = { ...scenario, impactMode: 'combined' as const }
    expect(simulateClimate(portfolio.slice(0, 12), combined).clients[0]).toEqual(simulateClimate([portfolio[0]!], combined).clients[0])
  })
  test('más inventario reduce faltantes sin fabricar daño evitado', () => {
    const a = simulateClimate(remote, scenario)
    const b = simulateClimate(remote, { ...scenario, supply: { ...scenario.supply, inventoryDays: 20 } })
    expect(b.indirectLoss).toBeLessThan(a.indirectLoss)
    expect(b.expectedLoss).toBeLessThan(a.expectedLoss)
    expect(b.damage).toBe(0)
    expect(b.clients.reduce((s, r) => s + r.unmetDays, 0)).toBeLessThan(a.clients.reduce((s, r) => s + r.unmetDays, 0))
  })
  test('la alternativa del caso de prueba reduce impacto neto, aun con sobrecosto', () => {
    const a = simulateClimate(remote, scenario)
    const b = simulateClimate(remote, { ...scenario, supply: { ...scenario.supply, substitution: 70 } })
    expect(b.indirectLoss).toBeLessThan(a.indirectLoss)
    expect(b.expectedLoss).toBeLessThan(a.expectedLoss)
    expect(b.baseLoss).toBe(a.baseLoss)
  })
  test('intensidad cero, red desactivada y modo directo aíslan los canales', () => {
    const zero = simulateClimate(portfolio, { ...scenario, intensity: 0 })
    expect(zero.damage + zero.indirectLoss + zero.operatingLoss).toBe(0)
    expect(zero.expectedLoss).toBeCloseTo(zero.baseLoss, 8)
    const disabled = simulateClimate(remote, { ...scenario, supply: { ...scenario.supply, enabled: false } })
    expect(disabled.indirectLoss).toBe(0)
    expect(disabled.expectedLoss).toBeCloseTo(disabled.baseLoss, 8)
    expect(simulateClimate(portfolio, { ...scenario, impactMode: 'direct' }).indirectLoss).toBe(0)
  })
  test('la combinación acota caída de ventas y concilia partidas sin sumar crédito al daño', () => {
    const r = simulateClimate(portfolio, { ...scenario, impactMode: 'combined' })
    expect(r.economicImpact).toBeCloseTo(r.damage + r.operatingLoss, 6)
    expect(r.indirectLoss).toBeLessThanOrEqual(r.operatingLoss + epsilon)
    expect(r.clients.reduce((s, c) => s + c.indirectLoss, 0)).toBeCloseTo(r.indirectLoss, 8)
    expect(r.clients.every(c => c.revenueDrop >= 0 && c.revenueDrop <= 1)).toBe(true)
  })
  test('datos insuficientes/vencidos bloquean nuevos resultados; modo directo sigue disponible', () => {
    for (const dataQuality of ['missing', 'stale'] as const) {
      const invalid = { ...scenario, supply: { ...scenario.supply, dataQuality } }
      expect(() => analyze(portfolio, invalid, 1000)).toThrow('Simulación detenida')
      expect(() => simulateClimate(portfolio, { ...invalid, impactMode: 'direct' })).not.toThrow()
      const direct = analyze(remote, { ...invalid, impactMode: 'direct' }, 1000)
      expect(direct.before.indirectLoss).toBe(0)
      expect(direct.indirectOnly).toBeNull()
    }
  })
  test('parámetros y datos financieros cambian huella; no se reutilizan revisiones', () => {
    const base = scenarioFingerprint(remote, scenario, 1000)
    expect(scenarioFingerprint(remote, { ...scenario, supply: { ...scenario.supply, substitution: 70 } }, 1000)).not.toBe(base)
    expect(scenarioFingerprint(remote, { ...scenario, impactMode: 'direct' }, 1000)).not.toBe(base)
    expect(scenarioFingerprint(remote.map(c => ({ ...c, cash: c.cash + 1 })), scenario, 1000)).not.toBe(base)
  })
  test('planifica impacto indirecto, respeta presupuesto y concilia beneficio y comparaciones', () => {
    const a = analyze(remote, scenario, 5000)
    expect(a.plan.ids.length).toBeGreaterThan(0)
    expect(a.plan.cost).toBeLessThanOrEqual(5000)
    expect(a.before.economicImpact - a.after.economicImpact).toBeCloseTo(a.plan.benefit, 5)
    expect(a.directOnly.indirectLoss).toBe(0)
    expect(a.indirectOnly!.damage).toBe(0)
    expect(a.after.expectedLoss).toBeLessThanOrEqual(a.before.expectedLoss)
    expect(a.trace[1]!.evidence).toContain('Piura')
  })
  test('presets son reproducibles y cubren fracaso de calidad sin simular una API oficial', () => {
    for (const p of supplyPresets.filter(p => p.id !== 'missing')) {
      const s = { ...scenario, intensity: p.intensity, impactMode: p.impactMode, supply: p.supply }
      expect(simulateClimate(remote, s)).toEqual(simulateClimate(remote, s))
    }
  })
})

describe('Seguimiento local con revisión humana', () => {
  const input = { reviewed: true, currentScenario: true, evidence: 'Evidencia sintética del asesor' }
  test('recorre aprobación, fallo, reintento, ejecución y cierre', () => {
    let stage: TaskStage = 'Pendiente'
    for (const next of ['Aprobada', 'Entrega fallida', 'Comunicada', 'Ejecutada', 'Cerrada'] as const)
      stage = transitionTask(stage, next, input)
    expect(stage).toBe('Cerrada')
  })
  test('bloquea saltos, duplicados, falta de revisión y resultados obsoletos', () => {
    expect(() => transitionTask('Pendiente', 'Ejecutada', input)).toThrow()
    expect(() => transitionTask('Aprobada', 'Aprobada', input)).toThrow()
    expect(() => transitionTask('Pendiente', 'Aprobada', { ...input, reviewed: false })).toThrow()
    expect(() => transitionTask('Pendiente', 'Aprobada', { ...input, currentScenario: false })).toThrow()
    expect(() => transitionTask('Pendiente', 'Aprobada', { ...input, evidence: 'corto' })).toThrow()
  })
})
