import { businesses } from './data'

export const hazards = ['Inundación', 'Lluvias intensas', 'Sequía', 'Friaje', 'Calor extremo'] as const
export const segments = ['Microempresa', 'Pequeña empresa', 'Consumo', 'Hipotecario', 'Mediana empresa'] as const
export type Threat = typeof hazards[number]
export interface Client {
  id: string; name: string; district: string; sector: string; segment: string
  lat: number; lng: number; exposure: number; vulnerability: number
  income: number; expenses: number; assets: number; balance: number
  payment: number; otherDebt: number; cash: number; arrears: number
  incidents: number; observations: number; cost: number
}
export interface ClimateScenario {
  hazard: Threat; intensity: number; days: number; paths: number; seed: number; lgd: number
}
export const defaultScenario: ClimateScenario = { hazard: 'Inundación', intensity: 75, days: 30, paths: 1500, seed: 2026, lgd: .45 }
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
/** 60 explicitly synthetic clients, independently jittered near district centers. */
export const portfolio: Client[] = Array.from({ length: 60 }, (_, i) => {
  const b = businesses[i % businesses.length]!
  const rng = random(4100 + i * 97)
  const scale = .65 + rng() * 1.3
  const segment = segments[Math.floor(i / 12)]!
  const multiplier = [1, 2.8, .65, 4, 9][Math.floor(i / 12)]!
  const income = Math.round(b.income * scale * Math.sqrt(multiplier))
  const expenses = Math.round(income * (.63 + rng() * .18))
  const surplus = income - expenses
  const [lat, lng] = centers[b.district]!
  return {
    id: `CE-${String(i + 1).padStart(3, '0')}`,
    name: i < 12 ? b.name : `${['Negocio', 'Comercial', 'Unidad', 'Empresa'][Math.floor(i / 12) - 1]} ${b.name.replace(/^(Agroindustrias|Servicios|Restaurante|Transportes) /, '')}`,
    district: b.district, sector: b.sector, segment,
    lat: lat + (rng() - .5) * .018, lng: lng + (rng() - .5) * .018,
    exposure: b.exposure, vulnerability: .35 + rng() * .45,
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
}
export interface Simulation {
  clients: ClientResult[]; losses: number[]; damages: number[]
  expectedLoss: number; baseLoss: number; damage: number; p10: number; p90: number; var95: number; es95: number
}
export function validateScenario(s: ClimateScenario) {
  if (!hazards.includes(s.hazard) || ![s.intensity, s.days, s.paths, s.seed, s.lgd].every(Number.isFinite)
      || s.intensity < 0 || s.intensity > 100 || s.days <= 0 || s.days > 90
      || !Number.isInteger(s.paths) || s.paths < 100 || s.paths > 10000
      || !Number.isInteger(s.seed) || s.seed < 1 || s.seed > 2147483647 || s.lgd < 0 || s.lgd > 1) throw new Error('Escenario fuera de rango')
}
export function simulateClimate(clients: Client[], scenario: ClimateScenario, protectedIds: string[] = []): Simulation {
  validateScenario(scenario)
  const rng = random(scenario.seed)
  const selected = new Set(protectedIds)
  const results = clients.map(client => ({
    client, damage: 0, shortfall: 0, pd: 0, basePD: 0, expectedLoss: 0, baseLoss: 0, coverage: 0,
    closedDays: 0, revenueDrop: 0, eventProbability: 0, p10: 0, p90: 0, level: 'Baja' as ClientResult['level'],
  }))
  const histories = clients.map(() => [] as number[])
  const losses: number[] = [], damages: number[] = []
  const districts = [...new Set(clients.map(c => c.district))].sort()
  for (let path = 0; path < scenario.paths; path++) {
    // One global and one district draw produce correlated, not independent exposure.
    const globalEvent = rng(), globalSeverity = .65 + .7 * rng()
    const districtEvent = Object.fromEntries(districts.map(d => [d, rng()]))
    let loss = 0, damageTotal = 0
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i]!, r = results[i]!
      const post = posterior(c.incidents, c.observations)
      const monthly = betaDraw(post.alpha, post.beta, rng)
      // Scenario window transforms a monthly event probability; credit window remains 30 days.
      const probability = 1 - (1 - monthly) ** (scenario.days / 30)
      const eventDraw = path % 2 === 0 ? globalEvent : districtEvent[c.district]!
      const occurs = eventDraw < probability
      const severity = clamp(scenario.intensity / 100 * c.exposure * sensitivity(scenario.hazard, c.sector) * globalSeverity)
      const protection = selected.has(c.id) ? .38 : 0
      const damageRatio = occurs ? severity ** 1.6 * c.vulnerability * (1 - protection) : 0
      const damage = c.assets * damageRatio
      const closedDays = occurs ? Math.min(30, severity * 16 * (1 - protection)) : 0
      const drop = Math.min(.9, closedDays / 30 + damageRatio * .25)
      const revenueNoise = Math.exp(.10 * normal(rng) - .005)
      const revenue = c.income * revenueNoise * (1 - drop)
      const expenses = c.expenses * (1 - drop * .25)
      const obligations = c.payment + c.otherDebt
      const available = revenue - expenses + c.cash - damage * .035
      const coverage = available / Math.max(1, obligations)
      const baseCoverage = (c.income * revenueNoise - c.expenses + c.cash) / Math.max(1, obligations)
      const pd = stressPD(c, coverage, damageRatio).pd
      const basePD = stressPD(c, baseCoverage, 0).pd
      const expectedLoss = pd * scenario.lgd * c.balance
      // Conditional expected losses, NOT Bernoulli realized defaults. Histogram is named accordingly.
      loss += expectedLoss; damageTotal += damage
      r.damage += damage; r.shortfall += coverage < 1 ? 1 : 0; r.coverage += coverage
      r.closedDays += closedDays; r.revenueDrop += drop; r.eventProbability += probability
      r.pd += pd; r.basePD += basePD; r.expectedLoss += expectedLoss
      r.baseLoss += basePD * scenario.lgd * c.balance
      histories[i]!.push(expectedLoss)
    }
    losses.push(loss); damages.push(damageTotal)
  }
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!
    for (const field of ['damage', 'shortfall', 'pd', 'basePD', 'expectedLoss', 'baseLoss', 'coverage', 'closedDays', 'revenueDrop', 'eventProbability'] as const) r[field] /= scenario.paths
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
  scenario: ClimateScenario; budget: number; fingerprint: string
}
export function scenarioFingerprint(clients: Client[], scenario: ClimateScenario, budget: number) {
  return `CE-1.0/${scenario.hazard}/${scenario.intensity}/${scenario.days}/${scenario.paths}/${scenario.seed}/${scenario.lgd}/${budget}/${clients.map(c => c.id).join(',')}`
}
export function analyze(clients: Client[], scenario: ClimateScenario, budget: number): Analysis {
  const before = simulateClimate(clients, scenario)
  const full = simulateClimate(clients, scenario, clients.map(c => c.id))
  const plan = optimize(before.clients.map((r, i) => ({ id: r.client.id, cost: r.client.cost, benefit: Math.max(0, r.damage - full.clients[i]!.damage) })), budget)
  const after = simulateClimate(clients, scenario, plan.ids)
  return {
    before, after, plan, scenario, budget,
    fingerprint: scenarioFingerprint(clients, scenario, budget),
    trace: [
      { name: 'Vigía de datos', tool: 'validateScenario + posterior', status: 'warning', evidence: `${clients.length} registros sintéticos; 24 observaciones binarias por registro. Sin ingestión oficial. Ubicaciones ficticias.` },
      { name: 'Analista de escenarios', tool: 'simulateClimate', status: 'ok', evidence: `${scenario.paths.toLocaleString('es-PE')} trayectorias; semilla ${scenario.seed}. Choques comunes y distritales. Logit con coeficientes supuestos.` },
      { name: 'Planificador preventivo', tool: 'optimize (mochila 0/1)', status: 'ok', evidence: `${plan.ids.length} intervenciones; costo S/ ${plan.cost}. Objetivo: daño monetario evitado al negocio; sesgo hacia activos de mayor valor por revisar.` },
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
