<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ExposureMap from './components/ExposureMap.vue'
import LossDistribution from './components/LossDistribution.vue'
import LossBridge from './components/LossBridge.vue'
import SupplyWorkbench from './components/SupplyWorkbench.vue'
import PreventiveFollowup from './components/PreventiveFollowup.vue'
import EvidenceCatalog from './components/EvidenceCatalog.vue'
import PortfolioManager from './components/PortfolioManager.vue'
import QuotaReliefSimulator from './components/QuotaReliefSimulator.vue'
import {
  compareAnalyses,
  defaultScenario,
  hazards,
  measureProfile,
  modelVersion,
  portfolio as defaultPortfolio,
  scenarioFingerprint,
  segments,
  stressPD,
  type Analysis,
  type Client,
  type ClimateScenario,
  type Threat,
} from './domain/escudo'
import { chainForClient, type Origin } from './domain/supply'
import { money } from './domain/risk'
import { taskStages, type TaskEvent, type TaskStage } from './domain/workflow'
import { workspaces, workspaceFromHash } from './domain/workspace'

const view = ref(workspaceFromHash(location.hash))
const activeWorkspace = computed(() => workspaces.find(w => w.id === view.value)!)
watch(activeWorkspace, workspace => { document.title = `${workspace.label} | CajaEscudo` }, { immediate: true })
const onHashChange = () => {
  if (workspaces.some(w => `#${w.id}` === location.hash))
    view.value = workspaceFromHash(location.hash)
}
window.addEventListener('hashchange', onHashChange)
watch(view, value => {
  if (location.hash !== `#${value}`) history.pushState(null, '', `#${value}`)
})

const portfolioKey = 'cajaescudo-portfolio-v1'
const storageKey = 'cajaescudo-reviews-v1'
const followupStorageKey = 'cajaescudo-followup-v1'
const scenariosStorageKey = 'cajaescudo-scenarios-v1'

function loadLocalPortfolio(): { clients: Client[]; custom: boolean } {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(portfolioKey) || 'null')
    if (Array.isArray(raw) && raw.length > 0 && raw.every(c => c && typeof c.id === 'string' && typeof c.name === 'string')) {
      return { clients: raw as Client[], custom: true }
    }
  } catch { /* ignore */ }
  return { clients: [...defaultPortfolio], custom: false }
}

const initialPortfolio = loadLocalPortfolio()
const activePortfolio = ref<Client[]>(initialPortfolio.clients)
const customPortfolio = ref(initialPortfolio.custom)

const scenario = ref<ClimateScenario>({ ...defaultScenario, supply: { ...defaultScenario.supply } })
const budget = ref(15000)
const district = ref('Todos')
const segment = ref('Todos')
const search = ref('')
const selectedId = ref(activePortfolio.value[1]?.id ?? activePortfolio.value[0]?.id ?? '')
const layer = ref<'damage' | 'payment' | 'supply'>('damage')
const heat = ref(true)
const showCorridors = ref(true)
const showQuotaRelief = ref(false)
const concentrationTab = ref<'segment' | 'district' | 'chain'>('segment')
const stageFilter = ref<'Todos' | TaskStage>('Todos')
const role = ref<'Analista de riesgos' | 'Supervisor' | 'Asesor de campo'>('Analista de riesgos')
const advisor = ref('Analista de riesgos')
const forcedIncludeIds = ref<string[]>([])
const excludedIds = ref<string[]>([])

const busy = ref(false)
const error = ref('')
const message = ref('')
const result = ref<Analysis>()
const pinnedAnalysis = ref<Analysis | null>(null)
const currentJob = ref(0)
const elapsed = ref(0)
const note = ref('')
const scenarioName = ref('')

interface ScenarioSnapshot {
  id: number
  name: string
  hazard: string
  intensity: number
  budget: number
  payload_json: string
}

interface SimulatedFeedItem {
  region: string
  source: string
  rain_mm_24h: number
  max_temp_c: number
  river_discharge_m3s: number
  suggested_hazard: Threat
  suggested_intensity: number
  suggested_origin: Origin
  status: string
}

const demoFeeds: SimulatedFeedItem[] = [
  { region: 'Piura (Costa Norte)', source: 'SENAMHI / Open-Meteo (demo)', rain_mm_24h: 58, max_temp_c: 32, river_discharge_m3s: 420, suggested_hazard: 'Inundación', suggested_intensity: 90, suggested_origin: 'Piura', status: 'Alerta simulada' },
  { region: 'La Libertad (Trujillo)', source: 'SENAMHI / Open-Meteo (demo)', rain_mm_24h: 34, max_temp_c: 29, river_discharge_m3s: 195, suggested_hazard: 'Lluvias intensas', suggested_intensity: 75, suggested_origin: 'Piura', status: 'Vigilancia simulada' },
  { region: 'Ica (Corredor Sur)', source: 'MTC / Open-Meteo (demo)', rain_mm_24h: 12, max_temp_c: 35, river_discharge_m3s: 80, suggested_hazard: 'Calor extremo', suggested_intensity: 65, suggested_origin: 'Ica', status: 'Vigilancia simulada' },
  { region: 'Junín (Sierra Central)', source: 'SENAMHI / MTC (demo)', rain_mm_24h: 4, max_temp_c: 7, river_discharge_m3s: 45, suggested_hazard: 'Friaje', suggested_intensity: 70, suggested_origin: 'Junín', status: 'Alerta simulada' },
]

interface Review { id: string; fingerprint: string; date: string; note: string; advisor?: string }
const storageAvailable = ref(true)
function loadReviews(): Review[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((r): r is Review => typeof r?.id === 'string' && typeof r?.fingerprint === 'string' && typeof r?.date === 'string' && typeof r?.note === 'string').slice(-100)
  } catch { storageAvailable.value = false; return [] }
}
function loadFollowup(): Record<string, TaskEvent[]> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(followupStorageKey) || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter(([, events]) => Array.isArray(events) && events.every(e =>
        e && taskStages.includes(e.stage) && typeof e.evidence === 'string' && typeof e.date === 'string',
      )).slice(-100))
    }
  } catch { storageAvailable.value = false }
  return {}
}
function loadLocalScenarios(): ScenarioSnapshot[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(scenariosStorageKey) || '[]')
    return Array.isArray(raw) ? raw as ScenarioSnapshot[] : []
  } catch { return [] }
}

const reviews = ref<Review[]>(loadReviews())
const followupRecords = ref<Record<string, TaskEvent[]>>(loadFollowup())
const savedScenarios = ref<ScenarioSnapshot[]>(loadLocalScenarios())

const districtsList = computed(() => [...new Set(activePortfolio.value.map(c => c.district))])
const clients = computed(() => activePortfolio.value.filter(c => (district.value === 'Todos' || c.district === district.value) && (segment.value === 'Todos' || c.segment === segment.value)))
const overrides = computed(() => ({ forcedIncludeIds: forcedIncludeIds.value, excludedIds: excludedIds.value }))
const fingerprint = computed(() => scenarioFingerprint(clients.value, scenario.value, budget.value, overrides.value))
const dirty = computed(() => !!result.value && result.value.fingerprint !== fingerprint.value)
const ranked = computed(() => [...(result.value?.before.clients ?? [])].sort((a, b) => b.shortfall - a.shortfall || b.damage - a.damage))
const listed = computed(() => ranked.value.filter(r => `${r.client.name} ${r.client.id} ${r.client.district} ${r.client.region}`.toLocaleLowerCase('es').includes(search.value.toLocaleLowerCase('es'))))
const chosen = computed(() => ranked.value.find(r => r.client.id === selectedId.value) ?? ranked.value[0])
const balance = computed(() => ranked.value.reduce((s, r) => s + r.client.balance, 0))
const exposed = computed(() => ranked.value.filter(r => r.damage > .01 || r.indirectLoss > .01))
const highPriority = computed(() => ranked.value.filter(r => r.level === 'Alta').length)
const planRows = computed(() => ranked.value.filter(r => result.value?.plan.ids.includes(r.client.id)))
const candidateRows = computed(() => ranked.value.filter(r => !result.value?.plan.ids.includes(r.client.id)).slice(0, 12))
const planDistricts = computed(() => new Set(planRows.value.map(r => r.client.district)).size)
const planSectors = computed(() => new Set(planRows.value.map(r => r.client.segment)).size)
const hasReview = (id: string) => reviews.value.some(r => r.id === id && r.fingerprint === result.value?.fingerprint)
const reviewed = computed(() => !!chosen.value && hasReview(chosen.value.client.id))
const selectedLogit = computed(() => chosen.value ? stressPD(chosen.value.client, chosen.value.coverage, chosen.value.damage / chosen.value.client.assets) : undefined)
const comparison = computed(() => pinnedAnalysis.value && result.value ? compareAnalyses(pinnedAnalysis.value, result.value) : null)

const concentrationRows = computed(() => {
  const groups = concentrationTab.value === 'segment'
    ? segments.map(name => ({ name, rows: ranked.value.filter(r => r.client.segment === name) }))
    : concentrationTab.value === 'district'
      ? [...new Set(ranked.value.map(r => r.client.district))].map(name => ({ name, rows: ranked.value.filter(r => r.client.district === name) }))
      : [...new Set(ranked.value.map(r => `${chainForClient(r.client).product} (${chainForClient(r.client).origin})`))].map(name => ({
          name,
          rows: ranked.value.filter(r => `${chainForClient(r.client).product} (${chainForClient(r.client).origin})` === name),
        }))
  return groups
    .filter(g => g.rows.length > 0)
    .map(g => ({
      name: g.name,
      count: g.rows.length,
      balance: g.rows.reduce((s, r) => s + r.client.balance, 0),
      loss: g.rows.reduce((s, r) => s + r.expectedLoss, 0),
      pressure: g.rows.filter(r => r.level === 'Alta').length,
    }))
    .sort((a, b) => b.loss - a.loss)
})

const selectedFollowupKey = computed(() => `${result.value?.fingerprint ?? ''}/${chosen.value?.client.id ?? ''}`)
const selectedFollowupHistory = computed(() => followupRecords.value[selectedFollowupKey.value] ?? [])

const caseQueue = computed(() => {
  const fp = result.value?.fingerprint ?? ''
  return ranked.value
    .filter(r => result.value?.plan.ids.includes(r.client.id) || r.level === 'Alta' || hasReview(r.client.id))
    .map(r => {
      const history = followupRecords.value[`${fp}/${r.client.id}`] ?? []
      const stage: TaskStage = history.at(-1)?.stage ?? 'Pendiente'
      return { row: r, reviewed: hasReview(r.client.id), stage, historyCount: history.length }
    })
    .filter(item => stageFilter.value === 'Todos' || item.stage === stageFilter.value)
})

const pct = (value: number) => `${(value * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`
const compact = (n: number) => n >= 1e6 ? `S/ ${(n / 1e6).toFixed(2)} M` : n >= 1e3 ? `S/ ${(n / 1e3).toFixed(1)} mil` : money(n)
const levelClass = (level: string) => level === 'Alta' ? 'high' : level === 'Moderada' ? 'moderate' : 'low'
const actionFor = (row: typeof ranked.value[number]) => {
  const profile = measureProfile(row.client.sector, scenario.value.hazard)
  return row.indirectLoss > 0
    ? `${row.damage > 0 ? `${profile.label}; ` : ''}reserva de ${profile.extraInventoryDays} días y sustitución adicional de hasta ${Math.round(profile.extraSubstitution * 100)} pp`
    : profile.label
}

let worker: Worker | undefined
let started = 0
let updateTimer: ReturnType<typeof setTimeout> | undefined
function run() {
  clearTimeout(updateTimer)
  if (busy.value) { worker?.terminate(); worker = undefined }
  if (!worker) startWorker()
  if (!worker) return
  currentJob.value++
  busy.value = true; error.value = ''; message.value = ''; started = performance.now()
  worker.postMessage({
    id: currentJob.value,
    clients: JSON.parse(JSON.stringify(clients.value)),
    scenario: JSON.parse(JSON.stringify(scenario.value)),
    budget: budget.value,
    overrides: JSON.parse(JSON.stringify(overrides.value)),
  })
}
function startWorker() {
  try {
    worker = new Worker(new URL('./workers/risk.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = event => {
      if (event.data.id !== currentJob.value) return
      busy.value = false
      elapsed.value = Math.round(performance.now() - started)
      if (event.data.error) { error.value = event.data.error; return }
      result.value = event.data.result
      if (!ranked.value.some(r => r.client.id === selectedId.value)) selectedId.value = ranked.value[0]?.client.id ?? ''
    }
    worker.onerror = () => { busy.value = false; error.value = 'El motor no pudo ejecutarse. Reintenta el escenario o recarga la página.' }
  } catch { busy.value = false; worker = undefined; error.value = 'No se pudo iniciar el análisis. Intenta recargar la página.' }
}
function scheduleUpdate() {
  currentJob.value++
  busy.value = true
  clearTimeout(updateTimer)
  updateTimer = setTimeout(run, 250)
}

run()
onBeforeUnmount(() => { clearTimeout(updateTimer); worker?.terminate(); window.removeEventListener('hashchange', onHashChange) })
watch(fingerprint, scheduleUpdate)
watch(selectedId, () => { note.value = ''; message.value = '' })

function persistLocalPortfolio(list: Client[], custom: boolean) {
  try {
    if (custom) localStorage.setItem(portfolioKey, JSON.stringify(list))
    else localStorage.removeItem(portfolioKey)
  } catch { storageAvailable.value = false }
}

function applyImportedPortfolio(list: Client[]) {
  activePortfolio.value = list
  customPortfolio.value = true
  district.value = 'Todos'
  segment.value = 'Todos'
  forcedIncludeIds.value = []
  excludedIds.value = []
  persistLocalPortfolio(list, true)
  message.value = `Cartera actualizada en el prototipo (${list.length} clientes).`
}

function upsertSingleClient(client: Client) {
  const next = activePortfolio.value.some(c => c.id === client.id)
    ? activePortfolio.value.map(c => c.id === client.id ? client : c)
    : [client, ...activePortfolio.value]
  applyImportedPortfolio(next)
  selectedId.value = client.id
}

function resetPortfolioToDefault() {
  activePortfolio.value = [...defaultPortfolio]
  customPortfolio.value = false
  district.value = 'Todos'
  segment.value = 'Todos'
  forcedIncludeIds.value = []
  excludedIds.value = []
  persistLocalPortfolio([], false)
  message.value = 'Cartera restablecida al fixture base de 60 clientes.'
}

function toggleForceInclude(id: string) {
  excludedIds.value = excludedIds.value.filter(x => x !== id)
  forcedIncludeIds.value = forcedIncludeIds.value.includes(id)
    ? forcedIncludeIds.value.filter(x => x !== id)
    : [...forcedIncludeIds.value, id]
}

function toggleExclude(id: string) {
  forcedIncludeIds.value = forcedIncludeIds.value.filter(x => x !== id)
  excludedIds.value = excludedIds.value.includes(id)
    ? excludedIds.value.filter(x => x !== id)
    : [...excludedIds.value, id]
}

function resetPlanOverrides() {
  forcedIncludeIds.value = []
  excludedIds.value = []
}

function applyFeedSuggestion(item: SimulatedFeedItem) {
  scenario.value.hazard = item.suggested_hazard
  scenario.value.intensity = item.suggested_intensity
  scenario.value.supply.origin = item.suggested_origin
  message.value = `Escenario demo cargado desde ${item.region}: ${item.suggested_hazard} (${item.suggested_intensity}%), origen ${item.suggested_origin}.`
}

function saveCurrentScenario() {
  if (!result.value || dirty.value || busy.value) return
  const name = scenarioName.value.trim() || `${result.value.scenario.hazard} ${result.value.scenario.intensity}%`
  const localItem: ScenarioSnapshot = {
    id: Date.now(),
    name,
    hazard: result.value.scenario.hazard,
    intensity: result.value.scenario.intensity,
    budget: result.value.budget,
    payload_json: JSON.stringify(result.value.scenario),
  }
  savedScenarios.value = [localItem, ...savedScenarios.value].slice(0, 20)
  try { localStorage.setItem(scenariosStorageKey, JSON.stringify(savedScenarios.value)) } catch { storageAvailable.value = false }
  scenarioName.value = ''
  message.value = `Snapshot "${name}" guardado en esta sesión.`
}

function loadSavedScenario(item: ScenarioSnapshot) {
  try {
    const parsed = JSON.parse(item.payload_json) as ClimateScenario
    scenario.value = { ...parsed, supply: { ...parsed.supply } }
    budget.value = item.budget
    message.value = `Escenario "${item.name}" cargado.`
  } catch {
    error.value = 'No se pudo cargar el escenario guardado.'
  }
}

function review() {
  if (!chosen.value || !result.value || busy.value || dirty.value || note.value.trim().length < 8) return
  const record: Review = {
    id: chosen.value.client.id,
    fingerprint: result.value.fingerprint,
    date: new Date().toISOString(),
    note: note.value.trim().slice(0, 500),
    advisor: advisor.value.trim() || role.value,
  }
  reviews.value = [...reviews.value, record].slice(-100)
  try { localStorage.setItem(storageKey, JSON.stringify(reviews.value)); message.value = 'Revisión registrada.' }
  catch { storageAvailable.value = false; message.value = 'Revisión conservada solo en memoria.' }
  note.value = ''
}

function onFollowupAdvance(payload: { nextStage: TaskStage; evidence: string }) {
  if (!chosen.value || !result.value) return
  const taskKey = `${result.value.fingerprint}/${chosen.value.client.id}`
  const nextEvent: TaskEvent = { stage: payload.nextStage, evidence: payload.evidence, date: new Date().toISOString() }
  const updated = { ...followupRecords.value, [taskKey]: [...(followupRecords.value[taskKey] ?? []), nextEvent] }
  followupRecords.value = Object.fromEntries(Object.entries(updated).slice(-100))
  try { localStorage.setItem(followupStorageKey, JSON.stringify(followupRecords.value)) } catch { storageAvailable.value = false }
  message.value = `Estado actualizado a ${payload.nextStage}.`
}

function exportCSV() {
  if (!result.value || dirty.value || busy.value) return
  const a = result.value
  const rows: (string | number)[][] = [
    ['Datos', 'Cliente', 'Negocio', 'Zona', 'Region', 'Segmento', 'Saldo PEN', 'Dano fisico PEN', 'Perdida operativa indirecta PEN', 'Impacto economico total PEN', 'Origen', 'Insumo', 'Relacion', 'Faltante equivalente dias', 'Flujo insuficiente prob', 'PD supuesta 30d', 'Perdida crediticia PEN', 'Con prevencion PEN', 'Medida propuesta', 'Amenaza', 'Intensidad', 'Ventana amenaza dias', 'Trayectorias', 'Semilla', 'LGD', 'Canal', 'Origen choque', 'Interrupcion nominal dias', 'Inventario dias', 'Sustitucion pct', 'Calidad fixture', 'Version', 'Huella'],
    ...a.before.clients.map((r, i) => [customPortfolio.value ? 'CARTERA DEMO CARGADA (NO CALIBRADA)' : 'SINTETICOS NO CALIBRADOS', r.client.id, r.client.name, r.client.district, r.client.region, r.client.segment, r.client.balance, r.damage.toFixed(2), r.indirectLoss.toFixed(2), r.economicImpact.toFixed(2), chainForClient(r.client).origin, chainForClient(r.client).product, r.client.supplyOrigin ? 'DECLARADA' : 'SINTETICA', r.unmetDays.toFixed(2), r.shortfall.toFixed(4), r.pd.toFixed(4), r.expectedLoss.toFixed(2), a.after.clients[i]!.expectedLoss.toFixed(2), a.plan.ids.includes(r.client.id) ? actionFor(r) : '', a.scenario.hazard, a.scenario.intensity, a.scenario.days, a.scenario.paths, a.scenario.seed, a.scenario.lgd, a.scenario.impactMode, a.scenario.supply.origin, a.scenario.supply.outageDays, a.scenario.supply.inventoryDays, a.scenario.supply.substitution, a.scenario.supply.dataQuality, modelVersion, a.fingerprint]),
  ]
  const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'cajaescudo-prototipo.csv'; link.click(); URL.revokeObjectURL(url)
  message.value = 'Reporte exportado.'
}
</script>

<template>
  <UApp>
    <div class="escudo-app">
      <a class="skip-link" href="#main-content">Ir al contenido</a>
      <header class="product-header">
        <div class="product-identity">
          <a class="product-brand" href="#monitoring" aria-label="CajaEscudo, monitoreo"><UIcon name="i-lucide-shield-check" /><span>CajaEscudo<small>Gestión de riesgo climático</small></span></a>
          <span class="brand-separator"></span><img class="institution-logo" src="/brand/caja-trujillo.png" alt="Caja Trujillo" width="110" height="45">
        </div>
        <div class="event-identity"><span class="environment-label">Prototipo interactivo · Visión de producto</span><img src="/brand/cajathon.png" alt="Cajathon" width="104" height="51"></div>
      </header>
      <nav class="product-nav" aria-label="Navegación principal">
        <div><a v-for="tab in workspaces" :key="tab.id" :href="`#${tab.id}`" :class="{ active: view === tab.id, 'nav-settings': tab.id === 'settings' }" :aria-current="view === tab.id ? 'page' : undefined"><UIcon :name="tab.icon" />{{ tab.label }}</a></div>
        <label class="workspace-role-select" aria-label="Rol de vista">
          <select v-model="role">
            <option>Analista de riesgos</option>
            <option>Supervisor</option>
            <option>Asesor de campo</option>
          </select>
        </label>
      </nav>

      <main id="main-content" class="escudo-main">
        <div class="workspace-heading">
          <div>
            <h1>{{ activeWorkspace.label }}</h1>
            <p class="workspace-scope">{{ clients.length }} clientes <span aria-hidden="true">/</span> {{ district === 'Todos' ? 'Todos los distritos' : district }} <span aria-hidden="true">/</span> {{ segment === 'Todos' ? 'Todos los segmentos' : segment }} <span aria-hidden="true">/</span> {{ customPortfolio ? 'Cartera cargada' : 'Base sintética' }}</p>
          </div>
          <div class="heading-actions">
            <button class="button secondary" @click="view = 'settings'"><UIcon name="i-lucide-upload" /> Cargar cartera</button>
            <button class="button secondary" :disabled="!result || busy || dirty" @click="exportCSV"><UIcon name="i-lucide-download" /> Exportar reporte</button>
          </div>
        </div>

        <section class="scenario-console" aria-label="Configuración del escenario">
          <div class="scenario-label"><UIcon name="i-lucide-sliders-horizontal" /><strong>Escenario</strong></div>
          <label>Amenaza<select v-model="scenario.hazard" aria-label="Amenaza climática"><option v-for="h in hazards" :key="h">{{ h }}</option></select></label>
          <label>Distrito<select v-model="district" aria-label="Filtrar distrito"><option>Todos</option><option v-for="d in districtsList" :key="d">{{ d }}</option></select></label>
          <label>Segmento<select v-model="segment" aria-label="Filtrar segmento"><option>Todos</option><option v-for="s in segments" :key="s">{{ s }}</option></select></label>
          <label class="intensity-control"><span>Intensidad <b>{{ scenario.intensity }}%</b></span><input v-model.number="scenario.intensity" type="range" min="0" max="100" step="5" aria-label="Intensidad climática"></label>
          <label>Ventana de amenaza<select v-model.number="scenario.days" aria-label="Ventana de amenaza"><option :value="7">7 días</option><option :value="30">30 días</option><option :value="90">90 días</option></select></label>
          <label>Canal de impacto<select v-model="scenario.impactMode" aria-label="Canal de impacto"><option value="combined">Directo + indirecto</option><option value="direct">Solo directo</option><option value="indirect">Solo indirecto</option></select></label>
        </section>
        <div class="execution-status" aria-live="polite">
          <span><span class="signal-dot" :class="{ pending: busy || dirty }"></span>{{ error ? 'Análisis detenido · resultados anteriores' : busy || dirty ? 'Actualizando…' : result ? `Actualizado (${elapsed} ms)` : 'Cargando…' }}</span>
          <span class="simulation-context">{{ customPortfolio ? 'Cartera cargada en navegador' : 'Datos sintéticos' }} · Resultados no calibrados · Demo sin backend <button class="method-link" @click="view = 'settings'" aria-label="Ver metodología y hoja de ruta"><UIcon name="i-lucide-info" /></button></span>
        </div>
        <div v-if="error" class="notice error-notice" role="alert"><span>{{ error }}</span><button @click="view = 'settings'">Revisar configuración</button><button @click="run">Reintentar</button></div>
        <div v-if="message" class="notice" role="status">{{ message }}<button aria-label="Cerrar confirmación" @click="message = ''"><UIcon name="i-lucide-x" /></button></div>

        <div v-if="result" class="analysis-content" :class="{ 'is-updating': busy || dirty }" :aria-busy="busy || dirty">
          <div v-if="!ranked.length && view !== 'settings'" class="empty-panel"><UIcon name="i-lucide-map-pin-off" /><h2>Sin clientes</h2><p>No hay clientes para los filtros seleccionados.</p><button class="button primary" @click="district = 'Todos'; segment = 'Todos'">Restablecer filtros</button></div>

          <SupplyWorkbench v-else-if="view === 'supply'" :analysis="result" :scenario="scenario" :selected="chosen" :pending="busy || dirty" @scenario="scenario = $event" @select="selectedId = $event" @review="view = 'followup'" />

          <template v-else-if="view === 'monitoring'">
            <section class="territory-workspace">
              <div class="map-workbench">
                <div class="map-heading">
                  <div><h2>Exposición territorial</h2><span>{{ result.scenario.hazard }} · {{ result.scenario.intensity }}% · {{ ranked.length }} clientes</span></div>
                  <div class="map-toggles">
                    <label class="heat-check"><input v-model="showCorridors" type="checkbox"> Corredores de red</label>
                    <label class="heat-check"><input v-model="heat" type="checkbox"> Mapa de calor</label>
                  </div>
                </div>
                <div class="map-layer-controls" aria-label="Variable del mapa"><button :class="{ active: layer === 'damage' }" :aria-pressed="layer === 'damage'" @click="layer = 'damage'">Daño físico</button><button :class="{ active: layer === 'supply' }" :aria-pressed="layer === 'supply'" @click="layer = 'supply'">Impacto indirecto</button><button :class="{ active: layer === 'payment' }" :aria-pressed="layer === 'payment'" @click="layer = 'payment'">Presión de pago</button></div>
                <ExposureMap :items="ranked" :selected="chosen?.client.id ?? ''" :layer="layer" :heat="heat" :corridors="showCorridors" :active-origin="scenario.supply.origin" @select="selectedId = $event" />
                <div class="map-bottomline"><span><UIcon name="i-lucide-info" /> La exposición climática no implica incumplimiento.</span><button @click="view = 'settings'">Metodología</button></div>
              </div>
              <aside class="territory-intelligence" aria-label="Resumen del escenario">
                <div class="intelligence-title"><UIcon name="i-lucide-radar" /><span>Resumen de exposición</span></div>
                <div class="territory-number"><span>Impacto económico al negocio</span><strong>{{ compact(result.before.economicImpact) }}</strong><p>{{ compact(result.before.damage) }} de daño físico y {{ compact(result.before.operatingLoss) }} de pérdida operativa, incluidos {{ compact(result.before.indirectLoss) }} indirectos.</p></div>
                <div class="territory-pair"><div><strong>{{ highPriority }}<small>/ {{ ranked.length }}</small></strong><span>Prioridad alta de atención</span></div><div><strong>{{ compact(exposed.reduce((s, r) => s + r.client.balance, 0)) }}</strong><span>Saldo con impacto directo o indirecto simulado</span></div></div>
                <div class="institution-exposure"><span>Pérdida crediticia estimada</span><strong>{{ compact(result.before.expectedLoss) }}</strong><p>P10–P90 <b>{{ compact(result.before.p10) }} — {{ compact(result.before.p90) }}</b></p><button @click="view = 'portfolio'">Ver riesgo de cartera <UIcon name="i-lucide-chart-column" /></button></div>
                <div class="preventive-signal"><UIcon name="i-lucide-shield-check" /><div><strong>{{ result.plan.ids.length }} intervenciones propuestas</strong><button @click="view = 'interventions'">Ver intervenciones</button></div></div>
              </aside>
            </section>

            <div class="cases-layout">
              <section class="case-list-panel">
                <div class="section-title"><h2>Clientes prioritarios</h2><span>Ordenados por insuficiencia de flujo</span></div>
                <label class="search-field"><UIcon name="i-lucide-search" /><input v-model="search" type="search" placeholder="Cliente, código o distrito" aria-label="Buscar cliente"></label>
                <div class="client-list"><button v-for="r in listed" :key="r.client.id" class="client-row" :class="{ selected: chosen?.client.id === r.client.id }" :aria-pressed="chosen?.client.id === r.client.id" @click="selectedId = r.client.id">
                  <span class="client-avatar"><UIcon :name="r.client.sector === 'Agricultura' ? 'i-lucide-sprout' : r.client.sector === 'Manufactura' ? 'i-lucide-factory' : 'i-lucide-store'" /></span>
                  <span class="client-name"><strong>{{ r.client.name }}</strong><small>{{ r.client.id }} · {{ r.client.district }}</small></span>
                  <span class="client-prob">{{ pct(r.shortfall) }}<small>flujo insuficiente</small></span><span class="risk-label" :class="levelClass(r.level)">{{ r.level }}</span>
                </button><div v-if="!listed.length" class="list-empty">Sin coincidencias. <button @click="search = ''">Limpiar búsqueda</button></div></div>
              </section>
              <section v-if="chosen" class="client-dossier">
                <div class="section-title"><span class="dossier-code">{{ chosen.client.id }} / Expediente preventivo</span><span class="risk-label" :class="levelClass(chosen.level)">Prioridad {{ chosen.level.toLowerCase() }}</span></div>
                <h2>{{ chosen.client.name }}</h2><p>{{ chosen.client.sector }} · {{ chosen.client.segment }} · {{ chosen.client.district }}</p>
                <div class="dossier-dependency"><UIcon name="i-lucide-network" /><div><strong>{{ chainForClient(chosen.client).product }} desde {{ chainForClient(chosen.client).origin }}</strong><span>{{ chosen.client.region }} · {{ chosen.unmetDays.toFixed(1) }} días equivalentes sin abastecimiento</span><span>Daño físico: {{ money(chosen.damage) }} · Impacto indirecto: {{ money(chosen.indirectLoss) }}</span></div><button class="text-button" @click="view = 'supply'">Ver dependencia</button></div>
                <div class="transmission-chain"><div><UIcon name="i-lucide-cloud-rain" /><strong>{{ chosen.closedDays.toFixed(1) }} días</strong><span>Interrupción estimada</span></div><UIcon name="i-lucide-chevron-right" /><div><UIcon name="i-lucide-trending-down" /><strong>−{{ pct(chosen.revenueDrop) }}</strong><span>Ingresos del mes</span></div><UIcon name="i-lucide-chevron-right" /><div><UIcon name="i-lucide-wallet" /><strong>{{ chosen.coverage.toFixed(2) }}×</strong><span>Cobertura media</span></div></div>
                <div class="dossier-financials"><span>Saldo <b>{{ money(chosen.client.balance) }}</b></span><span>Obligaciones / mes <b>{{ money(chosen.client.payment + chosen.client.otherDebt) }}</b></span><span>Incluye otras entidades <b>{{ money(chosen.client.otherDebt) }}</b></span><span>Atraso al corte <b>{{ chosen.client.arrears }} días</b></span></div>
                <p class="dossier-explanation"><UIcon name="i-lucide-scan-line" />Probabilidad de flujo insuficiente: {{ pct(chosen.shortfall) }}. Medida sugerida: {{ actionFor(chosen) }}.</p>
                <div class="dossier-actions">
                  <button class="button primary" @click="view = 'followup'">Revisar caso</button>
                  <button class="button secondary" @click="showQuotaRelief = !showQuotaRelief"><UIcon name="i-lucide-calculator" /> {{ showQuotaRelief ? 'Ocultar simulador' : 'Simular cuota adaptable' }}</button>
                  <button class="text-button" @click="view = 'interventions'">Ver intervenciones</button>
                </div>
                <QuotaReliefSimulator v-if="showQuotaRelief" :client-result="chosen" />
              </section>
            </div>
          </template>

          <template v-else-if="view === 'portfolio'">
            <section class="scenario-compare-bar">
              <div class="compare-actions">
                <button class="button secondary" @click="pinnedAnalysis = result"><UIcon name="i-lucide-git-compare" /> {{ pinnedAnalysis ? 'Actualizar referencia A' : 'Fijar escenario A' }}</button>
                <button v-if="pinnedAnalysis" class="text-button" @click="pinnedAnalysis = null">Quitar referencia</button>
                <input v-model="scenarioName" type="text" placeholder="Nombre del snapshot" aria-label="Nombre del escenario a guardar" class="snapshot-input">
                <button class="button secondary" :disabled="busy || dirty" @click="saveCurrentScenario"><UIcon name="i-lucide-bookmark" /> Guardar snapshot</button>
              </div>
              <div v-if="comparison" class="compare-deltas">
                <span>Ref A: <b>{{ pinnedAnalysis?.scenario.hazard }} {{ pinnedAnalysis?.scenario.intensity }}%</b></span>
                <span>Δ Impacto económico: <b :class="comparison.economicImpactDelta > 0 ? 'danger-text' : 'positive-text'">{{ comparison.economicImpactDelta >= 0 ? '+' : '' }}{{ compact(comparison.economicImpactDelta) }}</b></span>
                <span>Δ Pérdida estrés: <b :class="comparison.expectedLossDelta > 0 ? 'danger-text' : 'positive-text'">{{ comparison.expectedLossDelta >= 0 ? '+' : '' }}{{ compact(comparison.expectedLossDelta) }}</b></span>
                <span>Δ Indirecto: <b>{{ comparison.indirectLossDelta >= 0 ? '+' : '' }}{{ compact(comparison.indirectLossDelta) }}</b></span>
                <span>Prioridad alta: <b>{{ comparison.highPriorityBaseline }} → {{ comparison.highPriorityCurrent }}</b></span>
              </div>
              <details v-if="savedScenarios.length" class="method-details compact-details">
                <summary>Snapshots guardados ({{ savedScenarios.length }})</summary>
                <div class="snapshot-list">
                  <div v-for="s in savedScenarios" :key="s.id" class="snapshot-row">
                    <span><strong>{{ s.name }}</strong> · {{ s.hazard }} {{ s.intensity }}% · Presupuesto {{ money(s.budget) }}</span>
                    <button class="text-button" @click="loadSavedScenario(s)">Cargar</button>
                  </div>
                </div>
              </details>
            </section>

            <section class="financial-ribbon"><div><span>Saldo analizado</span><strong>{{ compact(balance) }}</strong><small>{{ ranked.length }} clientes en cartera</small></div><div><span>Pérdida crediticia base</span><strong>{{ compact(result.before.baseLoss) }}</strong><small>Referencia sin impacto climático</small></div><div><span>Incremento por estrés</span><strong class="danger-text">+{{ compact(result.before.expectedLoss - result.before.baseLoss) }}</strong><small>Impacto adicional estimado</small></div><div><span>Con plan preventivo</span><strong class="positive-text">{{ compact(result.after.expectedLoss) }}</strong><small>Pérdida residual estimada</small></div></section>
            <div class="analysis-charts">
              <section class="chart-panel"><div class="section-title"><h2>Distribución de pérdidas</h2><span>Pérdida esperada condicional</span></div><LossDistribution :values="result.before.losses" :p10="result.before.p10" :p90="result.before.p90" :mean="result.before.expectedLoss" /></section>
              <section class="chart-panel"><div class="section-title"><h2>Efecto de las intervenciones</h2><span>Estimación a 30 días</span></div><LossBridge :base="result.before.baseLoss" :stress="result.before.expectedLoss" :after="result.after.expectedLoss" /><div class="chart-foot">Inversión preventiva: <b>{{ money(result.plan.cost) }}</b></div></section>
            </div>
            <details class="method-details"><summary>Cómo se estima el impacto financiero</summary><p>EL = PD supuesta × LGD × saldo. Logit no entrenado; capacidad de pago a 30 días; LGD {{ pct(result.scenario.lgd) }}. El incremento representa sensibilidad del resultado antes de impuestos si se reconociera como gasto; no duplica pérdidas reconocidas ni calcula provisiones.</p><p>El rango P10–P90 refleja los supuestos del simulador, no precisión predictiva ni VaR regulatorio.</p></details>
            <section class="segment-panel">
              <div class="section-title">
                <h2>Concentración de riesgo</h2>
                <div class="map-layer-controls">
                  <button :class="{ active: concentrationTab === 'segment' }" @click="concentrationTab = 'segment'">Segmento</button>
                  <button :class="{ active: concentrationTab === 'district' }" @click="concentrationTab = 'district'">Distrito</button>
                  <button :class="{ active: concentrationTab === 'chain' }" @click="concentrationTab = 'chain'">Cadena</button>
                </div>
              </div>
              <div class="table-overflow"><table><caption class="sr-only">Exposición y pérdida esperada por agrupación</caption><thead><tr><th>Agrupación</th><th>Clientes</th><th>Saldo</th><th>Pérdida de estrés</th><th>Prioridad alta</th><th>Concentración de pérdida</th></tr></thead><tbody><tr v-for="r in concentrationRows" :key="r.name"><th scope="row">{{ r.name }}</th><td>{{ r.count }}</td><td>{{ money(r.balance) }}</td><td>{{ money(r.loss) }}</td><td>{{ r.pressure }}</td><td><span class="table-bar"><i :style="{ width: `${r.loss / Math.max(1, result.before.expectedLoss) * 100}%` }"></i></span> {{ pct(r.loss / Math.max(1, result.before.expectedLoss)) }}</td></tr></tbody></table></div>
            </section>
          </template>

          <template v-else-if="view === 'interventions'">
            <section class="prevention-layout">
              <div class="budget-panel">
                <h2>Presupuesto preventivo</h2>
                <label>Presupuesto disponible <strong>{{ money(budget) }}</strong><input v-model.number="budget" type="range" min="0" max="100000" step="1000" aria-label="Presupuesto preventivo"></label>
                <div class="budget-meter"><span :style="{ width: `${Math.min(100, result.budget ? result.plan.cost / result.budget * 100 : 0)}%` }"></span></div>
                <div class="budget-breakdown"><span>Asignado <b>{{ money(result.plan.cost) }}</b></span><span>Disponible <b>{{ money(result.budget - result.plan.cost) }}</b></span></div>
                <small v-if="result.plan.overBudget" class="warning-inline">Los casos fijados manualmente exceden el presupuesto.</small>
                <small v-else>Asignación óptima (mochila 0/1 en múltiplos de S/ 10) con overrides manuales.</small>
                <button v-if="forcedIncludeIds.length || excludedIds.length" class="button secondary override-reset" @click="resetPlanOverrides">Restablecer selección automática</button>
              </div>
              <div class="prevention-evidence">
                <div class="financial-ribbon compact-ribbon"><div><span>Negocios a proteger</span><strong>{{ result.plan.ids.length }}</strong><small>{{ planDistricts }} distritos · {{ planSectors }} segmentos</small></div><div><span>Impacto económico evitado</span><strong class="positive-text">{{ compact(result.before.economicImpact - result.after.economicImpact) }}</strong><small>Daño físico y pérdida operativa · efecto hipotético</small></div></div>
                <section class="chart-panel"><h2>Impacto económico estimado</h2><div class="intervention-comparison"><div><span>Sin intervención</span><strong>{{ money(result.before.economicImpact) }}</strong><i style="width:100%"></i></div><div><span>Con intervención</span><strong>{{ money(result.after.economicImpact) }}</strong><i class="residual" :style="{ width: `${result.after.economicImpact / Math.max(1, result.before.economicImpact) * 100}%` }"></i></div></div><div class="chart-foot">Inversión preventiva: <b>{{ money(result.plan.cost) }}</b></div><details class="method-details"><summary>Alcance del paquete preventivo</summary><p>Protección física, reserva de inventario y sustitución diferenciadas por sector y amenaza. El costo fijo incluye la reserva; no se financia ni descuenta de las pérdidas mostradas. Efectividad hipotética.</p></details></section>
                <details class="method-details"><summary>Criterios de priorización</summary><p>El objetivo monetario puede favorecer activos de mayor valor. Puedes fijar o excluir clientes manualmente para equilibrar cobertura territorial o de microempresas. El plan no implica desembolso ni cambios contractuales.</p></details>
              </div>
            </section>
            <section class="segment-panel">
              <div class="section-title"><h2>Intervenciones propuestas</h2><span>Revisión humana y ajuste manual</span></div>
              <div v-if="!planRows.length" class="list-empty">No hay medidas disponibles con este presupuesto. Ajusta el monto o fija clientes manualmente.</div>
              <div v-else class="table-overflow"><table><thead><tr><th>Cliente</th><th>Distrito</th><th>Paquete propuesto</th><th>Costo</th><th>Selección</th><th>Revisión</th></tr></thead><tbody>
                <tr v-for="r in planRows" :key="r.client.id"><th scope="row"><button class="table-link" @click="selectedId = r.client.id; view = 'followup'">{{ r.client.name }}<small>{{ r.client.id }} · {{ r.client.segment }}</small></button></th><td>{{ r.client.district }}</td><td>{{ actionFor(r) }}</td><td>{{ money(r.client.cost) }}</td><td><button class="text-button" @click="forcedIncludeIds.includes(r.client.id) ? toggleForceInclude(r.client.id) : toggleExclude(r.client.id)">{{ forcedIncludeIds.includes(r.client.id) ? 'Fijado (quitar)' : 'Excluir' }}</button></td><td><span class="risk-label" :class="hasReview(r.client.id) ? 'low' : 'moderate'">{{ hasReview(r.client.id) ? 'Revisado' : 'Pendiente' }}</span></td></tr>
              </tbody></table></div>
              <details v-if="candidateRows.length" class="method-details">
                <summary>Candidatos adicionales no incluidos ({{ candidateRows.length }} prioritarios)</summary>
                <div class="table-overflow"><table><thead><tr><th>Cliente</th><th>Segmento</th><th>Impacto económico</th><th>Costo</th><th>Acción</th></tr></thead><tbody>
                  <tr v-for="r in candidateRows" :key="r.client.id"><th scope="row">{{ r.client.name }} <small>{{ r.client.id }}</small></th><td>{{ r.client.segment }}</td><td>{{ money(r.economicImpact) }}</td><td>{{ money(r.client.cost) }}</td><td><button class="text-button" @click="toggleForceInclude(r.client.id)">Fijar en plan</button></td></tr>
                </tbody></table></div>
              </details>
            </section>
          </template>

          <template v-else-if="view === 'followup'">
            <section class="segment-panel queue-panel">
              <div class="section-title">
                <h2>Bandeja operativa de casos ({{ caseQueue.length }})</h2>
                <div class="queue-controls">
                  <label>Etapa<select v-model="stageFilter" aria-label="Filtrar por etapa"><option>Todos</option><option v-for="st in taskStages" :key="st">{{ st }}</option></select></label>
                  <label>Asesor<input v-model="advisor" type="text" maxlength="80" aria-label="Responsable de gestión"></label>
                </div>
              </div>
              <div class="table-overflow queue-table-wrap"><table><thead><tr><th>Cliente</th><th>Distrito</th><th>Prioridad</th><th>Revisión</th><th>Estado</th><th>Historial</th></tr></thead><tbody>
                <tr v-for="item in caseQueue" :key="item.row.client.id" :class="{ 'queue-selected': chosen?.client.id === item.row.client.id }">
                  <th scope="row"><button class="table-link" @click="selectedId = item.row.client.id">{{ item.row.client.name }}<small>{{ item.row.client.id }}</small></button></th>
                  <td>{{ item.row.client.district }}</td>
                  <td><span class="risk-label" :class="levelClass(item.row.level)">{{ item.row.level }}</span></td>
                  <td><span class="risk-label" :class="item.reviewed ? 'low' : 'neutral'">{{ item.reviewed ? 'Sí' : 'Pendiente' }}</span></td>
                  <td><span class="risk-label neutral">{{ item.stage }}</span></td>
                  <td>{{ item.historyCount }}</td>
                </tr>
              </tbody></table></div>
            </section>

            <details class="process-details">
              <summary>Registro del análisis <span>{{ modelVersion }} · {{ elapsed }} ms</span></summary>
              <section class="agent-trace">
                <div class="section-title"><h2>Etapas de procesamiento</h2><span>Agentes deterministas · Sin LLM</span></div>
                <ol><li v-for="(step, i) in result.trace" :key="step.name"><span class="agent-step-index">{{ i + 1 }}</span><div>
                  <div class="agent-step-title"><h3>{{ step.name }}</h3><span class="risk-label" :class="step.status === 'ok' ? 'low' : 'moderate'">{{ step.status === 'ok' ? 'Completado' : 'Requiere revisión' }}</span></div>
                  <p>{{ step.evidence }}</p><details class="agent-step-details"><summary>Ver herramienta</summary><code>{{ step.tool }}</code></details>
                </div></li></ol>
                <details class="method-details"><summary>Detalles del procesamiento</summary><p>Agentes locales deterministas, sin LLM conectado. Tiempo de cálculo: {{ elapsed }} ms.</p><p class="trace-fingerprint">Referencia: {{ result.fingerprint }}</p></details>
              </section>
            </details>
            <div class="followup-workspace">
              <section v-if="chosen" class="human-review">
                <div class="review-heading"><UIcon name="i-lucide-user-check" /><span>Revisión del caso ({{ role }})</span></div>
                <label>Cliente<select v-model="selectedId" aria-label="Cliente para revisión"><option v-for="r in ranked" :key="r.client.id" :value="r.client.id">{{ r.client.id }} · {{ r.client.name }}</option></select></label>
                <h2>{{ chosen.client.name }}</h2><span class="risk-label" :class="reviewed ? 'low' : levelClass(chosen.level)">{{ reviewed ? 'Revisado en este escenario' : `Prioridad ${chosen.level.toLowerCase()}` }}</span>
                <p class="review-summary">{{ pct(chosen.shortfall) }} de trayectorias con insuficiencia de flujo. Daño físico: {{ money(chosen.damage) }}. Impacto indirecto: {{ money(chosen.indirectLoss) }}. {{ result.plan.ids.includes(chosen.client.id) ? 'Incluido en el plan preventivo.' : 'Sin medida asignada en este presupuesto.' }}</p>
                <div class="review-task"><strong>Acción a validar con el asesor</strong><p>{{ actionFor(chosen) }}. Verificar liquidez, factibilidad y consentimiento antes del contacto.</p></div>
                <label>Observaciones <small>Mínimo 8 caracteres. No ingreses datos personales reales.</small><textarea v-model="note" maxlength="500" rows="3" placeholder="Disponibilidad de inventario y proveedor alternativo." aria-label="Evidencia de revisión"></textarea></label>
                <button class="button primary" :disabled="note.trim().length < 8 || busy || dirty" @click="review"><UIcon name="i-lucide-check-check" /> Guardar revisión</button>
                <small class="storage-note">{{ storageAvailable ? 'Se guarda únicamente en este navegador. No es una auditoría institucional.' : 'Almacenamiento bloqueado: los registros solo duran esta sesión.' }}</small>
                <details class="review-history"><summary>Historial local ({{ reviews.filter(r => r.id === chosen?.client.id).length }})</summary><p v-for="(r, i) in reviews.filter(r => r.id === chosen?.client.id).slice(-5).reverse()" :key="i"><b>{{ new Date(r.date).toLocaleString('es-PE') }}</b> · {{ r.advisor ?? 'Analista' }}<br>{{ r.note }}<small>Escenario {{ r.fingerprint }}</small></p></details>
              </section>
              <PreventiveFollowup v-if="chosen" :client-id="chosen.client.id" :fingerprint="result.fingerprint" :reviewed="reviewed" :disabled="busy || dirty" :history="selectedFollowupHistory" :advisor="advisor || role" @advance="onFollowupAdvance" />
            </div>
          </template>

          <template v-else>
            <PortfolioManager :clients="activePortfolio" :custom-active="customPortfolio" @import-clients="applyImportedPortfolio" @upsert-client="upsertSingleClient" @reset-default="resetPortfolioToDefault" />

            <section class="segment-panel">
              <div class="section-title">
                <h2>Monitor de alertas climáticas (vista previa de integración futura)</h2>
                <span class="risk-label neutral">Escenarios de referencia</span>
              </div>
              <p class="manager-intro">Simula cómo el conector futuro (SENAMHI, Open-Meteo, GloFAS y MTC) alimentará automáticamente la amenaza, intensidad y origen del choque en el sistema final.</p>
              <div class="table-overflow">
                <table>
                  <thead><tr><th>Región</th><th>Fuente prevista</th><th>Lluvia 24h</th><th>Temp. máx</th><th>Caudal</th><th>Estado</th><th>Sugerencia</th><th>Acción</th></tr></thead>
                  <tbody>
                    <tr v-for="f in demoFeeds" :key="f.region">
                      <th>{{ f.region }}</th>
                      <td>{{ f.source }}</td>
                      <td>{{ f.rain_mm_24h }} mm</td>
                      <td>{{ f.max_temp_c }} °C</td>
                      <td>{{ f.river_discharge_m3s }} m³/s</td>
                      <td><span class="risk-label moderate">{{ f.status }}</span></td>
                      <td>{{ f.suggested_hazard }} ({{ f.suggested_intensity }}%)</td>
                      <td><button class="text-button" @click="applyFeedSuggestion(f); view = 'monitoring'">Probar en mapa</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="settings-panel">
              <div class="section-title"><h2>Parámetros de simulación</h2><span>{{ modelVersion }}</span></div>
              <div class="settings-fields">
                <label>Trayectorias<select v-model.number="scenario.paths" aria-label="Cantidad de trayectorias"><option :value="500">500</option><option :value="1500">1,500</option><option :value="5000">5,000</option></select></label>
                <label>Semilla<input v-model.number="scenario.seed" type="number" min="1" max="2147483647" aria-label="Semilla de simulación"></label>
                <label>LGD supuesta <b>{{ pct(scenario.lgd) }}</b><input v-model.number="scenario.lgd" type="range" min="0" max="1" step=".05" aria-label="Pérdida dado incumplimiento"></label>
                <label>Calidad de datos de la red<select v-model="scenario.supply.dataQuality" aria-label="Calidad de datos de la red"><option value="complete">Completos</option><option value="missing">Insuficientes</option><option value="stale">Vencidos</option></select></label>
              </div>
              <p class="settings-note">Cambios aplicados automáticamente. Puedes probar condiciones de datos insuficientes o vencidos para demostrar los bloqueos de seguridad del producto final.</p>
            </section>
            <details class="settings-disclosure">
              <summary>Metodología y supuestos</summary>
              <div class="settings-content">
                <p class="settings-note">Datos sintéticos y parámetros no calibrados. Los resultados no son avisos oficiales, decisiones crediticias ni provisiones regulatorias. Prioridad alta: flujo insuficiente en ≥25% de trayectorias; moderada: ≥10% y &lt;25%; baja: &lt;10%.</p>
                <section class="model-comparison"><h2>Capacidades del prototipo y visión futura</h2><div class="table-overflow"><table><thead><tr><th>Módulo</th><th>Qué muestra el prototipo</th><th>Estado</th><th>Evolución en desarrollo completo</th></tr></thead><tbody>
                  <tr><th>Beta–Bernoulli</th><td>Frecuencia local supuesta; prior Beta(2,8).</td><td><span class="risk-label low">Activo en demo</span></td><td>Pronósticos ensemble condicionados (SENAMHI/Open-Meteo).</td></tr>
                  <tr><th>Red e inventario</th><td>Corredores, reserva, sustitución y sobrecostos.</td><td><span class="risk-label moderate">Fixtures / CSV</span></td><td>Grafo comercial-logístico NetworkX + SimPy y capacidad real.</td></tr>
                  <tr><th>Monte Carlo compartido</th><td>Choques comunes; origen remoto, intensidad y duración inciertas.</td><td><span class="risk-label low">Activo en demo</span></td><td>Ejecución vectorizada en servidor sobre cartera completa.</td></tr>
                  <tr><th>Función logística de estrés</th><td>Flujo, daño, atrasos y otras deudas con PD supuesta.</td><td><span class="risk-label moderate">No entrenada</span></td><td>Calibración con históricos de mora, Brier y supervivencia.</td></tr>
                  <tr><th>Mochila 0/1</th><td>Maximiza daño físico y pérdida operativa evitados con overrides manuales.</td><td><span class="risk-label low">Activo en demo</span></td><td>Restricciones de capacidad de asesores y equidad por segmento.</td></tr>
                  <tr><th>Cuotas adaptables</th><td>Reprogramación descontada según flujo post-shock y filtro de capacidad (≤70%).</td><td><span class="risk-label low">Activo en demo</span></td><td>Integración con core crediticio, tasas reales y consentimiento.</td></tr>
                </tbody></table></div></section>
                <section class="chart-panel"><h2>Factores del riesgo crediticio</h2><p>Ejemplo central: {{ chosen?.client.name ?? 'cartera' }}. No reconstruye la media por trayectoria.</p><div v-for="f in selectedLogit?.features ?? []" :key="f.label" class="factor-row"><span>{{ f.label }}</span><b>{{ f.contribution.toFixed(2) }}</b></div><p>Logit con coeficientes supuestos. Ingresos y capacidad de pago a 30 días.</p></section>
              </div>
            </details>
            <details class="settings-disclosure"><summary>Fuentes de datos <span>6 integraciones previstas</span></summary><div class="settings-content"><EvidenceCatalog /></div></details>
            <details class="settings-disclosure"><summary>Privacidad y almacenamiento</summary><div class="settings-content"><p>Revisiones, snapshots, cartera cargada y seguimiento se guardan solo en este navegador. No hay backend activo, envíos de mensajes ni conexión a datos bancarios.</p><p>El mapa base utiliza mosaicos de OpenStreetMap y requiere internet. El desarrollo futuro incorporará autenticación por rol, PostgreSQL/PostGIS y auditoría institucional.</p></div></details>
          </template>
        </div>
        <div v-else-if="!error" class="initial-loading" role="status"><UIcon class="spinning" name="i-lucide-loader-circle" /><h2>Cargando cartera</h2></div>

        <footer class="product-footer"><span><UIcon name="i-lucide-shield-check" /> CajaEscudo</span><p>{{ modelVersion }} · {{ customPortfolio ? 'Cartera cargada' : 'Datos sintéticos' }} · Prototipo de producto</p><button @click="view = 'settings'">Metodología y fuentes</button></footer>
      </main>

    </div>
  </UApp>
</template>
