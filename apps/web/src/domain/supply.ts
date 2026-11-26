/** Fictional interregional dependencies. No supplier, route or delivery is verified. */
export const supplyVersion = 'RED-1.0'
export const origins = ['Piura', 'Ica', 'Junín'] as const
export type Origin = typeof origins[number]
export const originCoordinates: Record<Origin, [number, number]> = {
  Piura: [-5.1945, -80.6328],
  Ica: [-14.0678, -75.7286],
  Junín: [-12.0651, -75.2049],
}
export const regionalHubCoordinates: [number, number] = [-8.1116, -79.0288]
export type ImpactMode = 'combined' | 'direct' | 'indirect'
export interface SupplyScenario {
  enabled: boolean
  origin: Origin
  outageDays: number
  inventoryDays: number
  substitution: number
  dataQuality: 'complete' | 'missing' | 'stale'
}
export const defaultSupply: SupplyScenario = {
  enabled: true, origin: 'Piura', outageDays: 18, inventoryDays: 3,
  substitution: 15, dataQuality: 'complete',
}
export interface SupplyChain {
  id: string; product: string; origin: Origin; producer: string
  corridor: string; hub: string; alternative: string; dependency: number
}
export const supplyChains: SupplyChain[] = [
  { id: 'rice', product: 'Granos y alimentos', origin: 'Piura', producer: 'Productor Costa Norte',
    corridor: 'Corredor norte', hub: 'Distribuidor de Chiclayo', alternative: 'Mayorista alternativo de Lima', dependency: .8 },
  { id: 'textiles', product: 'Insumos textiles', origin: 'Ica', producer: 'Proveedor textil del sur',
    corridor: 'Corredor sur', hub: 'Almacén de Lima', alternative: 'Proveedor alternativo de Arequipa', dependency: .7 },
  { id: 'inputs', product: 'Insumos productivos y ferretería', origin: 'Junín', producer: 'Proveedor de insumos del centro',
    corridor: 'Corredor central', hub: 'Distribuidor de Huancayo', alternative: 'Almacén alternativo de Trujillo', dependency: .85 },
]
export function chainForClient(client: { id: string; sector: string; name?: string; supplyOrigin?: Origin }) {
  if (client.supplyOrigin) {
    const byOrigin = supplyChains.find(c => c.origin === client.supplyOrigin)
    if (byOrigin) return byOrigin
  }
  // Mapping is an explicit fixture, not inferred real transactions.
  const productiveInput = client.sector === 'Agricultura' || /ferretería|taller/i.test(client.name ?? '')
  return supplyChains.find(c => c.id === (productiveInput ? 'inputs' : client.sector === 'Manufactura' ? 'textiles' : 'rice'))!
}
export interface InventoryDay {
  day: number; opening: number; delivered: number; served: number; unmet: number; closing: number
}
export function simulateInventory(input: {
  outageDays: number; inventoryDays: number; substitution: number; dependency: number; horizon?: number
}): InventoryDay[] {
  const { outageDays, inventoryDays, substitution, dependency, horizon = 30 } = input
  if (![outageDays, inventoryDays, substitution, dependency, horizon].every(Number.isFinite)
    || outageDays < 0 || outageDays > 30 || inventoryDays < 0 || inventoryDays > 30
    || substitution < 0 || substitution > 1 || dependency < 0 || dependency > 1
    || !Number.isInteger(horizon) || horizon < 1 || horizon > 90) throw new Error('Inventario fuera de rango')
  let stock = inventoryDays
  return Array.from({ length: horizon }, (_, i) => {
    const opening = stock
    // Daily demand = 1 normalized input unit. No backlog; unmet demand is lost.
    // Fractional outage on its last day avoids rounding artifacts.
    const disrupted = Math.max(0, Math.min(1, outageDays - i))
    const delivered = 1 - disrupted * dependency * (1 - substitution)
    const served = Math.min(1, opening + delivered)
    stock = Math.max(0, opening + delivered - served)
    return { day: i + 1, opening, delivered, served, unmet: 1 - served, closing: stock }
  })
}
export function validateSupply(s: SupplyScenario) {
  if (!origins.includes(s.origin) || typeof s.enabled !== 'boolean'
    || ![s.outageDays, s.inventoryDays, s.substitution].every(Number.isFinite)
    || s.outageDays < 0 || s.outageDays > 30 || s.inventoryDays < 0 || s.inventoryDays > 30
    || s.substitution < 0 || s.substitution > 100
    || !['complete', 'missing', 'stale'].includes(s.dataQuality)) throw new Error('Configuración de suministros inválida')
}
export interface SupplyImpact {
  outageDays: number; unmetDays: number; revenueDrop: number; costRatio: number
}
export function supplyImpact(
  client: { id: string; sector: string; name?: string; supplyOrigin?: Origin }, scenario: SupplyScenario,
  intensity: number, severity: number, occurs: boolean, protectedClient: boolean,
  options?: { extraInventoryDays?: number; extraSubstitution?: number },
): SupplyImpact {
  const chain = chainForClient(client)
  const outageDays = scenario.enabled && chain.origin === scenario.origin && occurs
    ? Math.min(30, scenario.outageDays * intensity / 100 * severity) : 0
  const extraSub = options?.extraSubstitution ?? .3
  const extraInv = options?.extraInventoryDays ?? 3
  const substitution = Math.min(1, scenario.substitution / 100 + (protectedClient ? extraSub : 0))
  const inventory = Math.min(30, scenario.inventoryDays + (protectedClient ? extraInv : 0))
  // Analytical equivalent of the daily inventory recurrence (constant demand).
  const unmetDays = Math.max(0, outageDays * chain.dependency * (1 - substitution) - inventory)
  return {
    outageDays, unmetDays, revenueDrop: unmetDays / 30,
    // Extra purchasing premium applies only to substituted disrupted volume.
    costRatio: .45 * chain.dependency * substitution * .25 * outageDays / 30,
  }
}
export const supplyPresets = [
  { id: 'remote', name: 'Desastre distante', description: 'Solo Piura: sin daño físico local, con interrupción compartida.',
    impactMode: 'indirect' as ImpactMode, intensity: 90, supply: { ...defaultSupply, outageDays: 22, inventoryDays: 2, substitution: 0 } },
  { id: 'alternative', name: 'Proveedor alternativo', description: 'Mismo choque y semilla; sustituye 70% del abastecimiento.',
    impactMode: 'indirect' as ImpactMode, intensity: 90, supply: { ...defaultSupply, outageDays: 22, inventoryDays: 2, substitution: 70 } },
  { id: 'reserve', name: 'Reserva de inventario', description: 'Mismo choque; 20 días de cobertura antes de agotar insumos.',
    impactMode: 'indirect' as ImpactMode, intensity: 90, supply: { ...defaultSupply, outageDays: 22, inventoryDays: 20, substitution: 0 } },
  { id: 'zero', name: 'Sin choque', description: 'Intensidad cero: conserva solo el riesgo crediticio base.',
    impactMode: 'combined' as ImpactMode, intensity: 0, supply: { ...defaultSupply } },
  { id: 'missing', name: 'Datos insuficientes', description: 'Bloquea estimaciones nuevas y revisión; conserva la última salida identificada como no vigente.',
    impactMode: 'combined' as ImpactMode, intensity: 90, supply: { ...defaultSupply, dataQuality: 'missing' as const } },
]
