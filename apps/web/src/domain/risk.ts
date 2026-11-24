export type Hazard = 'Lluvias intensas' | 'Inundación' | 'Sequía'
export interface Asset {
  id: string
  name: string
  value: number
  vulnerability: number
  measure: string
  cost: number
  reduction: number
}
export interface Business {
  id: string
  name: string
  owner: string
  sector: string
  district: string
  x: number
  y: number
  exposure: number
  income: number
  expenses: number
  principal: number
  assets: Asset[]
}
export interface Scenario { hazard: Hazard; horizon: number; intensity: number }
export const money = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
export function assess(b: Business, s: Scenario, protectedIds: string[] = []) {
  // Demonstration assumptions, not calibrated probabilities or official forecasts.
  const sectorFactor = s.hazard === 'Sequía' ? (b.sector === 'Agricultura' ? 1.25 : 0.35) : s.hazard === 'Inundación' ? 1.15 : 1
  const probability = Math.min(0.95, b.exposure * s.intensity / 100 * (s.horizon === 72 ? 1 : s.horizon === 48 ? 0.88 : 0.75) * sectorFactor)
  const assets = b.assets.map(a => {
    const vulnerability = Math.max(0, a.vulnerability - (protectedIds.includes(a.id) ? a.reduction : 0))
    return { ...a, loss: a.value * probability * vulnerability, protected: protectedIds.includes(a.id) }
  }).sort((a, c) => c.loss - a.loss)
  const loss = assets.reduce((sum, a) => sum + a.loss, 0)
  const total = assets.reduce((sum, a) => sum + a.value, 0)
  const score = Math.round(loss / total * 100)
  return { ...b, assets, probability, loss, total, score, level: score >= 40 ? 'Alto' : score >= 20 ? 'Medio' : 'Bajo' }
}
export function simulate(b: Business, loss: number, tea: number, months: number, shock: number) {
  const rate = Math.pow(1 + tea / 100, 1 / 12) - 1
  const payment = rate === 0 ? b.principal / months : b.principal * rate / (1 - Math.pow(1 + rate, -months))
  // Discounted cash-flow weighting keeps the same principal and monthly rate.
  const flows = Array.from({ length: months }, (_, i) => {
    const recovery = i < 2 ? shock / 100 : i < 4 ? shock / 200 : 0
    const seasonality = 1 + Math.sin(i * Math.PI / 6) * 0.12
    return Math.max(0, b.income * seasonality * (1 - recovery) - b.expenses - (i === 0 ? loss * 0.06 : 0))
  })
  const weights = flows.map(f => Math.max(0.1, f / (b.income - b.expenses)))
  const discounted = weights.reduce((sum, w, i) => sum + w / Math.pow(1 + rate, i + 1), 0)
  let balance = b.principal
  const schedule = flows.map((flow, i) => {
    const flexible = b.principal / discounted * weights[i]!
    const interest = balance * rate
    balance = Math.max(0, balance + interest - flexible)
    return { month: i + 1, flow, payment, flexible, interest, balance, capacity: flow * 0.7 }
  })
  const feasible = schedule.every(r => r.flexible <= r.capacity && r.flexible >= r.interest)
  return { schedule, payment, feasible, fixedTotal: payment * months, flexibleTotal: schedule.reduce((s, r) => s + r.flexible, 0), rate }
}
