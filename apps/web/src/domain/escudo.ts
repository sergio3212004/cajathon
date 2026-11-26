import { businesses } from './data'
import { chainForClient, defaultSupply, supplyImpact, supplyVersion, validateSupply, type ImpactMode, type SupplyScenario } from './supply'

export const modelVersion = 'CE-2.0'

export const hazards = ['Inundación', 'Lluvias intensas', 'Sequía', 'Friaje', 'Calor extremo'] as const
export const segments = ['Microempresa', 'Pequeña empresa', 'Consumo', 'Hipotecario', 'Mediana empresa'] as const
export type Threat = typeof hazards[number]
export interface Client {
  id: string; name: string; district: string; region: string; sector: string; segment: string
  lat: number; lng: number; exposure: number; vulnerability: number
  income: number; expenses: number; assets: number; balance: number
  payment: number; otherDebt: number; cash: number; arrears: number
  incidents: number; observations: number; cost: number
}
export interface ClimateScenario {
  hazard: Threat; intensity: number; days: number; paths: number; seed: number; lgd: number
  impactMode: ImpactMode; supply: SupplyScenario
}
export const defaultScenario: ClimateScenario = { hazard: 'Inundación', intensity: 75, days: 30, paths: 1500, seed: 2026, lgd: .45, impactMode: 'combined', supply: { ...defaultSupply } }
export const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))

/** Seeded PRNG: comparisons use identical draws (common random numbers). */
export function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6D2B79F5
    let t = a
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
const centers: Record<string, [number, number]> = {
  Laredo: [-8.089, -78.961], 'El Porvenir': [-8.075, -79.006],
  Trujillo: [-8.112, -79.028], 'La Esperanza': [-8.069, -79.055], Huanchaco: [-8.079, -79.104],
}
/** 60 synthetic clients: 48 in La Libertad and 12 remote counterpart examples. */
export const portfolio: Client[] = Array.from({ length: 60 }, (_, i) => {
  const b = businesses[i % businesses.length]!
  const rng = random(4100 + i * 97)
  const scale = .65 + rng() * 1.3
  const segment = segments[Math.floor(i / 12)]!
  const multiplier = [1, 2.8, .65, 4, 9][Math.floor(i / 12)]!
  const income = Math.round(b.income * scale * Math.sqrt(multiplier))
  const expenses = Math.round(income * (.63 + rng() * .18))
  const surplus = income - expenses
  const remote = i >= 48 ? [
    { district: 'Cercado de Lima', region: 'Lima', point: [-12.046, -77.043] },
    { district: 'Cerro Colorado', region: 'Arequipa', point: [-16.376, -71.56] },
    { district: 'El Tambo', region: 'Junín', point: [-12.05, -75.22] },
  ][i % 3]! : undefined
  const [lat, lng] = remote?.point ?? centers[b.district]!
  return {
    id: `CE-${String(i + 1).padStart(3, '0')}`,
    name: i < 12 ? b.name : `${['Negocio', 'Comercial', 'Unidad', 'Empresa'][Math.floor(i / 12) - 1]} ${b.name.replace(/^(Agroindustrias|Servicios|Restaurante|Transportes) /, '')}`,
    district: remote?.district ?? b.district, region: remote?.region ?? 'La Libertad', sector: b.sector, segment,
    lat: lat + (rng() - .5) * .018, lng: lng + (rng() - .5) * .018,
    exposure: remote ? 0 : b.exposure, vulnerability: .35 + rng() * .45,
    income, expenses, assets: b.assets.reduce((s, a) => s + a.value, 0) * scale,
    balance: Math.round(b.principal * multiplier * scale),
    payment: Math.round(surplus * (.35 + rng() * .28)),
    otherDebt: Math.round(surplus * (.05 + rng() * .18)),
    cash: Math.round(surplus * (.12 + rng() * .9)),
    arrears: i % 9 === 0 ? 12 : i % 7 === 0 ? 4 : 0,
    incidents: 2 + Math.round(b.exposure * 10), observations: 24,
    cost: Math.round((500 + rng() * 1400) / 100) * 100,
  }
})

export function quantile(sorted: number[], p: number) {
  if (!sorted.length) return 0
  const index = clamp(p) * (sorted.length - 1)
  const lo = Math.floor(index)
  return sorted[lo]! + (sorted[Math.ceil(index)]! - sorted[lo]!) * (index - lo)
}
/** Beta(2,8) prior, binary synthetic event history. Conjugate update only. */
export function posterior(incidents: number, observations: number) {
  if (!Number.isInteger(incidents) || !Number.isInteger(observations) || incidents < 0 || observations < incidents) throw new Error('Historial binario inválido')
  const alpha = 2 + incidents
  const beta = 8 + observations - incidents
  return { alpha, beta, mean: alpha / (alpha + beta), variance: alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1)) }
}
function normal(rng: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-10, rng()))) * Math.cos(2 * Math.PI * rng())
}
function gamma(shape: number, rng: () => number): number {
  // All current posterior shape parameters exceed one.
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d)
  for (;;) {
    const x = normal(rng), v = (1 + c * x) ** 3
    if (v <= 0) continue
    const u = rng()
    if (u < 1 - .0331 * x ** 4 || Math.log(u) < .5 * x ** 2 + d * (1 - v + Math.log(v))) return d * v
  }
}
function betaDraw(alpha: number, beta: number, rng: () => number) {
  const a = gamma(alpha, rng), b = gamma(beta, rng)
  return a / (a + b)
}

/** Hand-set logit stress function, not fitted or a validated probability of default. */
export function stressPD(client: Client, coverage: number, damageRatio: number) {
  const features = [
    { label: 'Intercepto de referencia', contribution: -3.8 },
    { label: 'Insuficiencia de cobertura', contribution: 2.1 * Math.max(0, 1 - coverage) },
    { label: 'Daño relativo de activos', contribution: 2.4 * damageRatio },
    { label: 'Atrasos previos', contribution: 1.1 * client.arrears / 30 },
    { label: 'Otras obligaciones', contribution: .7 * client.otherDebt / Math.max(1, client.payment + client.otherDebt) },
  ]
  const logit = features.reduce((sum, f) => sum + f.contribution, 0)
  return { pd: 1 / (1 + Math.exp(-logit)), features }
}
export function sensitivity(hazard: Threat, sector: string) {
  if (hazard === 'Sequía') return sector === 'Agricultura' ? 1.2 : .18
  if (hazard === 'Friaje') return sector === 'Agricultura' ? .9 : .25
  if (hazard === 'Calor extremo') return sector === 'Agricultura' ? .95 : .45
  return hazard === 'Inundación' ? 1 : .7
}
export interface ClientResult {
  client: Client; damage: number; shortfall: number; pd: number; basePD: number
  expectedLoss: number; baseLoss: number; coverage: number; closedDays: number; revenueDrop: number
  eventProbability: number; p10: number; p90: number; level: 'Alta' | 'Moderada' | 'Baja'
  indirectLoss: number; operatingLoss: number; economicImpact: number
  supplyDays: number; unmetDays: number
}
export interface Simulation {
  clients: ClientResult[]; losses: number[]; damages: number[]
  expectedLoss: number; baseLoss: number; damage: number; p10: number; p90: number; var95: number; es95: number
  indirectLoss: number; operatingLoss: number; economicImpact: number
}
export function validateScenario(s: ClimateScenario) {
  if (!hazards.includes(s.hazard) || ![s.intensity, s.days, s.paths, s.seed, s.lgd].every(Number.isFinite)
      || s.intensity < 0 || s.intensity > 100 || s.days <= 0 || s.days > 90
      || !Number.isInteger(s.paths) || s.paths < 100 || s.paths > 10000
       || !Number.isInteger(s.seed) || s.seed < 1 || s.seed > 2147483647 || s.lgd < 0 || s.lgd > 1) throw new Error('Escenario fuera de rango')
  if (!['combined', 'direct', 'indirect'].includes(s.impactMode)) throw new Error('Canal de impacto inválido')
  validateSupply(s.supply)
  if (s.impactMode !== 'direct' && s.supply.enabled && s.supply.dataQuality !== 'complete')
    throw new Error(`Simulación detenida: datos de suministros ${s.supply.dataQuality === 'stale' ? 'vencidos' : 'insuficientes'}. No hay una estimación financiera nueva. Restablece los datos de prueba o selecciona solo impacto directo.`)
}
export function simulateClimate(clients: Client[], scenario: ClimateScenario, protectedIds: string[] = []): Simulation {
  validateScenario(scenario)
  const rng = random(scenario.seed)
  // Independent client/district streams preserve comparisons when filtering.
  const hash = (s: string) => [...s].reduce((v, ch) => Math.imul(v ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0
  const clientRngs = clients.map(c => random(scenario.seed ^ hash(c.id)))
  const districtRngs = Object.fromEntries([...new Set(clients.map(c => c.district))].map(d => [d, random(scenario.seed ^ hash(d))]))
  const selected = new Set(protectedIds)
  const results = clients.map(client => ({
    client, damage: 0, shortfall: 0, pd: 0, basePD: 0, expectedLoss: 0, baseLoss: 0, coverage: 0,
    closedDays: 0, revenueDrop: 0, eventProbability: 0, p10: 0, p90: 0, level: 'Baja' as ClientResult['level'],
    indirectLoss: 0, operatingLoss: 0, economicImpact: 0, supplyDays: 0, unmetDays: 0,
  }))
  const histories = clients.map(() => [] as number[])
  const losses: number[] = [], damages: number[] = []
  const districts = [...new Set(clients.map(c => c.district))].sort()
  for (let path = 0; path < scenario.paths; path++) {
    // One global and one district draw produce correlated, not independent exposure.
    const globalEvent = rng(), globalSeverity = .65 + .7 * rng()
    const districtEvent = Object.fromEntries(districts.map(d => [d, districtRngs[d]!()]))
    // Fictional upstream occurrence, shared by every dependent client.
    const upstreamOccurs = globalEvent < 1 - (1 - .65) ** (scenario.days / 30)
    let loss = 0, damageTotal = 0
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i]!, r = results[i]!
      const clientRng = clientRngs[i]!
      const post = posterior(c.incidents, c.observations)
      const monthly = betaDraw(post.alpha, post.beta, clientRng)
      // Scenario window transforms a monthly event probability; credit window remains 30 days.
      const probability = 1 - (1 - monthly) ** (scenario.days / 30)
      const eventDraw = path % 2 === 0 ? globalEvent : districtEvent[c.district]!
      const occurs = eventDraw < probability
      const severity = scenario.impactMode === 'indirect' ? 0 : clamp(scenario.intensity / 100 * c.exposure * sensitivity(scenario.hazard, c.sector) * globalSeverity)
      const protection = selected.has(c.id) ? .38 : 0
      const damageRatio = occurs ? severity ** 1.6 * c.vulnerability * (1 - protection) : 0
      const damage = c.assets * damageRatio
      const closedDays = occurs ? Math.min(30, severity * 16 * (1 - protection)) : 0
      const directDrop = Math.min(.9, closedDays / 30 + damageRatio * .25)
      const upstream = supplyImpact(c, { ...scenario.supply, enabled: scenario.supply.enabled && scenario.impactMode !== 'direct' },
        scenario.intensity, globalSeverity, upstreamOccurs, selected.has(c.id))
      // Apply supply loss only to activity surviving the direct shock.
      const drop = directDrop + (1 - directDrop) * upstream.revenueDrop
      const revenueNoise = Math.exp(.10 * normal(clientRng) - .005)
      const revenue = c.income * revenueNoise * (1 - drop)
      const expenses = c.expenses * (1 - drop * .25)
      const obligations = c.payment + c.otherDebt
      const extraCost = c.expenses * upstream.costRatio * (1 - drop)
      const contribution = Math.max(0, c.income * revenueNoise - .25 * c.expenses)
      const indirectLoss = contribution * (1 - directDrop) * upstream.revenueDrop + extraCost
      const operatingLoss = contribution * drop + extraCost
      const available = revenue - expenses + c.cash - damage * .035 - extraCost
      const coverage = available / Math.max(1, obligations)
      const baseCoverage = (c.income * revenueNoise - c.expenses + c.cash) / Math.max(1, obligations)
      const pd = stressPD(c, coverage, damageRatio).pd
      const basePD = stressPD(c, baseCoverage, 0).pd
      const expectedLoss = pd * scenario.lgd * c.balance
      // Conditional expected losses, NOT Bernoulli realized defaults. Histogram is named accordingly.
      loss += expectedLoss; damageTotal += damage
      r.damage += damage; r.shortfall += coverage < 1 ? 1 : 0; r.coverage += coverage
      r.closedDays += closedDays; r.revenueDrop += drop; r.eventProbability += probability
      r.indirectLoss += indirectLoss; r.operatingLoss += operatingLoss; r.economicImpact += damage + operatingLoss
      r.supplyDays += upstream.outageDays; r.unmetDays += upstream.unmetDays
      r.pd += pd; r.basePD += basePD; r.expectedLoss += expectedLoss
      r.baseLoss += basePD * scenario.lgd * c.balance
      histories[i]!.push(expectedLoss)
    }
    losses.push(loss); damages.push(damageTotal)
  }
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!
    for (const field of ['damage', 'shortfall', 'pd', 'basePD', 'expectedLoss', 'baseLoss', 'coverage', 'closedDays', 'revenueDrop', 'eventProbability', 'indirectLoss', 'operatingLoss', 'economicImpact', 'supplyDays', 'unmetDays'] as const) r[field] /= scenario.paths
    const ordered = histories[i]!.sort((a, b) => a - b)
    r.p10 = quantile(ordered, .1); r.p90 = quantile(ordered, .9)
    r.level = r.shortfall >= .25 ? 'Alta' : r.shortfall >= .1 ? 'Moderada' : 'Baja'
  }
  const ordered = [...losses].sort((a, b) => a - b)
  const var95 = quantile(ordered, .95)
  const tail = ordered.filter(v => v >= var95)
  return {
    clients: results, losses, damages, expectedLoss: results.reduce((s, r) => s + r.expectedLoss, 0),
    baseLoss: results.reduce((s, r) => s + r.baseLoss, 0), damage: results.reduce((s, r) => s + r.damage, 0),
    indirectLoss: results.reduce((s, r) => s + r.indirectLoss, 0),
    operatingLoss: results.reduce((s, r) => s + r.operatingLoss, 0),
    economicImpact: results.reduce((s, r) => s + r.economicImpact, 0),
    p10: quantile(ordered, .1), p90: quantile(ordered, .9), var95, es95: tail.reduce((s, v) => s + v, 0) / Math.max(1, tail.length),
  }
}
export interface Candidate { id: string; cost: number; benefit: number }
/** Exact 0/1 knapsack with integer PEN costs; no negative/zero-gain actions. */
export function optimize(candidates: Candidate[], budget: number) {
  if (!Number.isFinite(budget) || budget < 0 || budget > 100000) throw new Error('Presupuesto inválido')
  const units = Math.floor(budget / 100)
  const valid = candidates.filter(c => c.benefit > 0 && c.cost > 0 && c.cost % 100 === 0)
  const dp: number[][] = [Array(units + 1).fill(0)]
  valid.forEach((c, i) => {
    const cost = c.cost / 100
    dp.push(Array.from({ length: units + 1 }, (_, b) => cost <= b ? Math.max(dp[i]![b]!, dp[i]![b - cost]! + c.benefit) : dp[i]![b]!))
  })
  let remaining = units
  const ids: string[] = []
  for (let i = valid.length; i > 0; i--) {
    if (dp[i]![remaining]! > dp[i - 1]![remaining]!) {
      const c = valid[i - 1]!
      ids.push(c.id); remaining -= c.cost / 100
    }
  }
  return { ids, cost: ids.reduce((s, id) => s + valid.find(c => c.id === id)!.cost, 0), benefit: dp[valid.length]![units]! }
}
export interface AgentStep { name: string; tool: string; status: 'ok' | 'warning'; evidence: string }
export interface Analysis {
  before: Simulation; after: Simulation; plan: ReturnType<typeof optimize>; trace: AgentStep[]
  directOnly: Simulation; indirectOnly: Simulation | null
  scenario: ClimateScenario; budget: number; fingerprint: string
}
export function scenarioFingerprint(clients: Client[], scenario: ClimateScenario, budget: number) {
  const data = JSON.stringify({ scenario, budget, clients })
  let a = 2166136261, b = 5381
  for (const ch of data) { a = Math.imul(a ^ ch.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ ch.charCodeAt(0) }
  // Local identity/checksum, not a cryptographic or institutional audit signature.
  return `${modelVersion}/${supplyVersion}/${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`
}
export function analyze(clients: Client[], scenario: ClimateScenario, budget: number): Analysis {
  const before = simulateClimate(clients, scenario)
  const full = simulateClimate(clients, scenario, clients.map(c => c.id))
  const plan = optimize(before.clients.map((r, i) => ({ id: r.client.id, cost: r.client.cost, benefit: Math.max(0, r.economicImpact - full.clients[i]!.economicImpact) })), budget)
  const after = simulateClimate(clients, scenario, plan.ids)
  const directOnly = scenario.impactMode === 'direct' ? before : simulateClimate(clients, { ...scenario, impactMode: 'direct' })
  // A direct-only analysis remains usable when network evidence is unavailable.
  // Do not fabricate a zero for the unavailable indirect diagnostic.
  const indirectOnly = scenario.supply.enabled && scenario.supply.dataQuality !== 'complete'
    ? null : scenario.impactMode === 'indirect' ? before : simulateClimate(clients, { ...scenario, impactMode: 'indirect' })
  return {
    before, after, directOnly, indirectOnly, plan, scenario, budget,
    fingerprint: scenarioFingerprint(clients, scenario, budget),
    trace: [
      { name: 'Vigía de datos', tool: 'validateScenario + validateSupply + posterior', status: 'warning', evidence: `${clients.length} registros sintéticos; historial binario supuesto. Sin ingestión oficial. Ubicaciones ficticias. Calidad de fixture: ${scenario.supply.dataQuality}.` },
      { name: 'Analista de escenarios y dependencias', tool: 'chainForClient + supplyImpact + simulateClimate', status: 'ok', evidence: `${scenario.paths.toLocaleString('es-PE')} trayectorias; semilla ${scenario.seed}. Origen ${scenario.supply.origin}; ${before.clients.filter(r => r.indirectLoss > 0).length} clientes con impacto indirecto. Canales ${scenario.impactMode}; choque compartido e inventario normalizado. ${new Set(clients.map(c => chainForClient(c).id)).size} cadenas sintéticas. Logit supuesto.` },
      { name: 'Planificador preventivo', tool: 'optimize (mochila 0/1)', status: 'ok', evidence: `${plan.ids.length} intervenciones; costo S/ ${plan.cost}. Objetivo: daño físico más pérdida operativa evitados; protección física, reserva y sustitución hipotéticas. Sesgo hacia negocios de mayor valor por revisar.` },
      { name: 'Revisor de seguridad', tool: 'guardrails', status: 'warning', evidence: 'Requiere aprobación humana. No modifica créditos, no contacta clientes y no atribuye PD real. Agentes locales deterministas, sin LLM.' },
    ],
  }
}
export function histogram(values: number[], count = 20) {
  if (!values.length) return []
  const min = Math.min(...values), max = Math.max(...values)
  const width = Math.max(1, max - min) / count
  const bins = Array.from({ length: count }, (_, i) => ({ lo: min + i * width, hi: min + (i + 1) * width, count: 0 }))
  for (const v of values) bins[Math.min(count - 1, Math.floor((v - min) / width))]!.count++
  return bins
}
