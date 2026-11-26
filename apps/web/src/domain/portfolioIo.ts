import { hazards, segments, type Client } from './escudo'
import { origins, type Origin } from './supply'

export const portfolioCsvColumns = [
  'id', 'name', 'district', 'region', 'sector', 'segment',
  'lat', 'lng', 'exposure', 'vulnerability',
  'income', 'expenses', 'assets', 'balance',
  'payment', 'otherDebt', 'cash', 'arrears',
  'incidents', 'observations', 'cost', 'supplyOrigin',
] as const

const validSectors = ['Agricultura', 'Comercio', 'Manufactura', 'Servicios'] as const

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export function serializePortfolioCsv(clients: Client[]): string {
  const rows: (string | number)[][] = [
    [...portfolioCsvColumns],
    ...clients.map(c => [
      c.id, c.name, c.district, c.region, c.sector, c.segment,
      c.lat.toFixed(5), c.lng.toFixed(5), c.exposure.toFixed(3), c.vulnerability.toFixed(3),
      c.income, c.expenses, Math.round(c.assets), c.balance,
      c.payment, c.otherDebt, c.cash, c.arrears,
      c.incidents, c.observations, c.cost, c.supplyOrigin ?? '',
    ]),
  ]
  return '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n')
}

export interface CsvImportResult {
  clients: Client[]
  errors: string[]
  warnings: string[]
}

export function parsePortfolioCsv(raw: string): CsvImportResult {
  const clean = raw.replace(/^\uFEFF/, '').trim()
  if (!clean) return { clients: [], errors: ['El archivo CSV está vacío.'], warnings: [] }
  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) {
    return { clients: [], errors: ['El CSV debe incluir cabecera y al menos una fila de cliente.'], warnings: [] }
  }
  const delimiter = lines[0]!.includes(';') && !lines[0]!.includes(',') ? ';' : ','
  const headers = splitCsvLine(lines[0]!, delimiter).map(h => h.toLowerCase())

  const required = ['id', 'name', 'district', 'sector', 'segment', 'lat', 'lng', 'income', 'expenses', 'assets', 'balance', 'payment']
  const missingCols = required.filter(col => !headers.includes(col.toLowerCase()))
  if (missingCols.length) {
    return { clients: [], errors: [`Faltan columnas obligatorias: ${missingCols.join(', ')}`], warnings: [] }
  }

  const idx = (name: string) => headers.indexOf(name.toLowerCase())
  const num = (row: string[], name: string, fallback?: number) => {
    const pos = idx(name)
    if (pos === -1 || row[pos] === '' || row[pos] === undefined) return fallback ?? NaN
    return Number(row[pos]!.replace(',', '.'))
  }

  const clients: Client[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const seenIds = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvLine(lines[i]!, delimiter)
    const rowNum = i + 1
    const get = (name: string) => {
      const pos = idx(name)
      return pos === -1 ? '' : (row[pos] ?? '').trim()
    }
    const id = get('id')
    const name = get('name')
    const district = get('district')
    const region = get('region') || 'La Libertad'
    const sector = get('sector')
    const segment = get('segment')

    if (!id || !name || !district) {
      errors.push(`Fila ${rowNum}: id, name y district son obligatorios.`)
      continue
    }
    if (seenIds.has(id)) {
      errors.push(`Fila ${rowNum}: id duplicado (${id}).`)
      continue
    }
    seenIds.add(id)

    if (!validSectors.includes(sector as typeof validSectors[number])) {
      warnings.push(`Fila ${rowNum} (${id}): sector "${sector}" no estándar; se aplicará sensibilidad por defecto.`)
    }
    if (!segments.includes(segment as typeof segments[number])) {
      errors.push(`Fila ${rowNum} (${id}): segmento inválido "${segment}". Permitidos: ${segments.join(', ')}.`)
      continue
    }

    const lat = num(row, 'lat')
    const lng = num(row, 'lng')
    const exposure = num(row, 'exposure', 0.5)
    const vulnerability = num(row, 'vulnerability', 0.45)
    const income = num(row, 'income')
    const expenses = num(row, 'expenses')
    const assets = num(row, 'assets')
    const balance = num(row, 'balance')
    const payment = num(row, 'payment')
    const otherDebt = num(row, 'otherDebt', 0)
    const cash = num(row, 'cash', 0)
    const arrears = Math.round(num(row, 'arrears', 0))
    const incidents = Math.round(num(row, 'incidents', 2))
    const observations = Math.round(num(row, 'observations', 24))
    const cost = Math.round(num(row, 'cost', 800))

    if (![lat, lng, exposure, vulnerability, income, expenses, assets, balance, payment, otherDebt, cash, arrears, incidents, observations, cost].every(Number.isFinite)) {
      errors.push(`Fila ${rowNum} (${id}): contiene valores numéricos inválidos.`)
      continue
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push(`Fila ${rowNum} (${id}): coordenadas fuera de rango (${lat}, ${lng}).`)
      continue
    }
    if (exposure < 0 || exposure > 1 || vulnerability < 0 || vulnerability > 1) {
      errors.push(`Fila ${rowNum} (${id}): exposure y vulnerability deben estar entre 0 y 1.`)
      continue
    }
    if (income <= 0 || assets <= 0 || balance <= 0 || payment <= 0 || cost <= 0) {
      errors.push(`Fila ${rowNum} (${id}): income, assets, balance, payment y cost deben ser mayores a 0.`)
      continue
    }
    if (incidents < 0 || observations < incidents) {
      errors.push(`Fila ${rowNum} (${id}): observations debe ser entero >= incidents >= 0.`)
      continue
    }

    const rawOrigin = get('supplyOrigin')
    let supplyOrigin: Origin | undefined
    if (rawOrigin) {
      if (origins.includes(rawOrigin as Origin)) supplyOrigin = rawOrigin as Origin
      else warnings.push(`Fila ${rowNum} (${id}): supplyOrigin "${rawOrigin}" ignorado (usa ${origins.join('/')}).`)
    }

    clients.push({
      id, name, district, region, sector, segment,
      lat, lng, exposure, vulnerability,
      income, expenses, assets, balance,
      payment, otherDebt, cash, arrears,
      incidents, observations, cost,
      ...(supplyOrigin ? { supplyOrigin } : {}),
    })
  }

  return { clients, errors, warnings }
}

export function suggestHazardFromRainMm(rainMm24h: number): { hazard: typeof hazards[number]; intensity: number } {
  if (rainMm24h >= 45) return { hazard: 'Inundación', intensity: Math.min(100, Math.round(55 + rainMm24h * 0.6)) }
  if (rainMm24h >= 12) return { hazard: 'Lluvias intensas', intensity: Math.min(95, Math.round(30 + rainMm24h * 1.4)) }
  return { hazard: 'Lluvias intensas', intensity: 15 }
}
