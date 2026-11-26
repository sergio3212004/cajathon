<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ExposureMap from './components/ExposureMap.vue'
import LossDistribution from './components/LossDistribution.vue'
import LossBridge from './components/LossBridge.vue'
import { defaultScenario, hazards, portfolio, scenarioFingerprint, segments, stressPD, type Analysis, type ClimateScenario } from './domain/escudo'
import { money } from './domain/risk'

const tabs = [
  { name: 'Territorio', icon: 'i-lucide-map' },
  { name: 'Cartera y pérdidas', icon: 'i-lucide-chart-no-axes-combined' },
  { name: 'Plan preventivo', icon: 'i-lucide-shield-check' },
  { name: 'Agentes', icon: 'i-lucide-workflow' },
  { name: 'Modelos y fuentes', icon: 'i-lucide-book-open' },
]
const view = ref('Territorio')
const scenario = ref<ClimateScenario>({ ...defaultScenario })
const budget = ref(15000)
const district = ref('Todos')
const segment = ref('Todos')
const search = ref('')
const selectedId = ref('CE-002')
const layer = ref<'damage' | 'payment'>('damage')
const heat = ref(true)
const busy = ref(false)
const error = ref('')
const message = ref('')
const result = ref<Analysis>()
const currentJob = ref(0)
const elapsed = ref(0)
const note = ref('')
const tour = ref(false)
const tourStep = ref(0)
const tourDialog = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null
watch(tour, async open => {
  if (open) {
    previousFocus = document.activeElement as HTMLElement | null
    await nextTick()
    tourDialog.value?.querySelector<HTMLButtonElement>('button')?.focus()
  } else previousFocus?.focus()
})
function trapTour(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const buttons = tourDialog.value?.querySelectorAll<HTMLButtonElement>('button')
  if (!buttons?.length) return
  const first = buttons[0]!, last = buttons[buttons.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
const tourSteps = [
  { title: 'Un escenario, no una certeza', body: 'Cambia la amenaza y su intensidad. Ejecuta el escenario: el mapa y las pérdidas se calculan, no son cifras dibujadas.', tab: 'Territorio' },
  { title: 'Del territorio al negocio', body: 'Selecciona un punto o un cliente. Compara exposición, flujo insuficiente y probabilidad crediticia supuesta: no son lo mismo.', tab: 'Territorio' },
  { title: 'La pérdida tiene un rango', body: 'Explora la distribución de trayectorias y el puente base–estrés–prevención. Los choques comunes evitan suponer clientes independientes.', tab: 'Cartera y pérdidas' },
  { title: 'Prevenir con recursos limitados', body: 'Ajusta el presupuesto y vuelve a ejecutar. La mochila 0/1 selecciona medidas para reducir daño al negocio. El costo se presenta separado.', tab: 'Plan preventivo' },
  { title: 'Una decisión con evidencia', body: 'Revisa las herramientas que ejecutó cada agente local. Guarda una revisión humana: no se modifica ningún crédito ni se envían mensajes.', tab: 'Agentes' },
]
interface Review { id: string; fingerprint: string; date: string; note: string }
const storageKey = 'cajaescudo-reviews-v1'
const storageAvailable = ref(true)
function loadReviews(): Review[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((r): r is Review => typeof r?.id === 'string' && typeof r?.fingerprint === 'string' && typeof r?.date === 'string' && typeof r?.note === 'string').slice(-100)
  } catch { storageAvailable.value = false; return [] }
}
const reviews = ref<Review[]>(loadReviews())
const clients = computed(() => portfolio.filter(c => (district.value === 'Todos' || c.district === district.value) && (segment.value === 'Todos' || c.segment === segment.value)))
const fingerprint = computed(() => scenarioFingerprint(clients.value, scenario.value, budget.value))
const dirty = computed(() => !!result.value && result.value.fingerprint !== fingerprint.value)
const ranked = computed(() => [...(result.value?.before.clients ?? [])].sort((a, b) => b.shortfall - a.shortfall || b.damage - a.damage))
const listed = computed(() => ranked.value.filter(r => `${r.client.name} ${r.client.id} ${r.client.district}`.toLocaleLowerCase('es').includes(search.value.toLocaleLowerCase('es'))))
const chosen = computed(() => ranked.value.find(r => r.client.id === selectedId.value) ?? ranked.value[0])
const balance = computed(() => ranked.value.reduce((s, r) => s + r.client.balance, 0))
const exposed = computed(() => ranked.value.filter(r => r.damage / r.client.assets >= .02))
const highPriority = computed(() => ranked.value.filter(r => r.level === 'Alta').length)
const planRows = computed(() => ranked.value.filter(r => result.value?.plan.ids.includes(r.client.id)))
const planDistricts = computed(() => new Set(planRows.value.map(r => r.client.district)).size)
const planSectors = computed(() => new Set(planRows.value.map(r => r.client.segment)).size)
const hasReview = (id: string) => reviews.value.some(r => r.id === id && r.fingerprint === result.value?.fingerprint)
const reviewed = computed(() => !!chosen.value && hasReview(chosen.value.client.id))
const selectedLogit = computed(() => chosen.value ? stressPD(chosen.value.client, chosen.value.coverage, chosen.value.damage / chosen.value.client.assets) : undefined)
const segmentRows = computed(() => segments.map(name => {
  const rows = ranked.value.filter(r => r.client.segment === name)
  return { name, count: rows.length, balance: rows.reduce((s, r) => s + r.client.balance, 0), loss: rows.reduce((s, r) => s + r.expectedLoss, 0), pressure: rows.filter(r => r.level === 'Alta').length }
}))
const pct = (value: number) => `${(value * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`
const compact = (n: number) => n >= 1e6 ? `S/ ${(n / 1e6).toFixed(2)} M` : n >= 1e3 ? `S/ ${(n / 1e3).toFixed(1)} mil` : money(n)
const levelClass = (level: string) => level === 'Alta' ? 'high' : level === 'Moderada' ? 'moderate' : 'low'
const measure = (sector: string, hazard: string) => hazard === 'Sequía' ? (sector === 'Agricultura' ? 'Reserva de agua y riego eficiente' : 'Reserva y abastecimiento alternativo') : hazard === 'Friaje' ? 'Cobertura térmica de activos sensibles' : hazard === 'Calor extremo' ? 'Sombra y protección térmica de inventario' : sector === 'Agricultura' ? 'Drenaje y protección de la cosecha' : 'Elevar inventario y proteger equipos'
let worker: Worker | undefined
let started = 0
function run() {
  if (!worker) return
  currentJob.value++
  busy.value = true; error.value = ''; message.value = ''; started = performance.now()
  worker.postMessage({ id: currentJob.value, clients: JSON.parse(JSON.stringify(clients.value)), scenario: { ...scenario.value }, budget: budget.value })
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
    run()
  } catch { error.value = 'Este navegador no permite iniciar el motor local. Usa un navegador con soporte de Web Workers.' }
}
startWorker()
onBeforeUnmount(() => worker?.terminate())
watch([district, segment], run)
watch(selectedId, () => { note.value = ''; message.value = '' })
function review() {
  if (!chosen.value || !result.value || busy.value || dirty.value || note.value.trim().length < 8) return
  const record: Review = { id: chosen.value.client.id, fingerprint: result.value.fingerprint, date: new Date().toISOString(), note: note.value.trim().slice(0, 500) }
  reviews.value = [...reviews.value, record].slice(-100)
  try { localStorage.setItem(storageKey, JSON.stringify(reviews.value)); message.value = 'Revisión guardada en este navegador. No se envió ninguna comunicación ni se modificó el crédito.' }
  catch { storageAvailable.value = false; message.value = 'Revisión conservada solo en memoria: el navegador bloquea el almacenamiento.' }
  note.value = ''
}
function exportCSV() {
  if (!result.value || dirty.value || busy.value) return
  const a = result.value
  const rows: (string | number)[][] = [
    ['Datos', 'Cliente', 'Negocio', 'Zona', 'Segmento', 'Saldo PEN', 'Dano negocio PEN', 'Flujo insuficiente prob', 'PD supuesta 30d', 'Perdida crediticia PEN', 'Con prevencion PEN', 'Medida propuesta', 'Amenaza', 'Intensidad', 'Ventana amenaza dias', 'Trayectorias', 'Semilla', 'LGD', 'Version'],
    ...a.before.clients.map((r, i) => ['SINTETICOS NO CALIBRADOS', r.client.id, r.client.name, r.client.district, r.client.segment, r.client.balance, r.damage.toFixed(2), r.shortfall.toFixed(4), r.pd.toFixed(4), r.expectedLoss.toFixed(2), a.after.clients[i]!.expectedLoss.toFixed(2), a.plan.ids.includes(r.client.id) ? measure(r.client.sector, a.scenario.hazard) : '', a.scenario.hazard, a.scenario.intensity, a.scenario.days, a.scenario.paths, a.scenario.seed, a.scenario.lgd, 'CE-1.0']),
  ]
  const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'cajaescudo-escenario-sintetico.csv'; link.click(); URL.revokeObjectURL(url)
  message.value = 'Reporte exportado con parámetros, semilla y advertencias del modelo.'
}
function advanceTour() {
  if (tourStep.value === tourSteps.length - 1) { tour.value = false; return }
  tourStep.value++; view.value = tourSteps[tourStep.value]!.tab
}
</script>

<template>
  <UApp>
    <div class="escudo-app">
      <a class="skip-link" href="#main-content">Ir al contenido</a>
      <header class="product-header">
        <div class="product-identity">
          <a class="product-brand" href="#" aria-label="CajaEscudo, territorio" @click.prevent="view = 'Territorio'"><UIcon name="i-lucide-shield-check" /><span>CajaEscudo<small>Inteligencia para llegar antes</small></span></a>
          <span class="brand-separator"></span><img class="institution-logo" src="/brand/caja-trujillo.png" alt="Caja Trujillo" width="110" height="45">
        </div>
        <div class="event-identity"><span>Propuesta RIE-01</span><img src="/brand/cajathon.png" alt="Cajathon" width="104" height="51"><button class="tour-button" @click="tour = true; tourStep = 0; view = 'Territorio'"><UIcon name="i-lucide-play" /> Recorrido para jueces</button></div>
      </header>
      <nav class="product-nav" aria-label="Navegación principal">
        <div><button v-for="tab in tabs" :key="tab.name" :class="{ active: view === tab.name }" :aria-current="view === tab.name ? 'page' : undefined" @click="view = tab.name"><UIcon :name="tab.icon" />{{ tab.name }}</button></div>
        <span class="analyst"><span>M</span>Miriam <small>Riesgos</small></span>
      </nav>

      <main id="main-content" class="escudo-main">
        <div class="workspace-heading"><div><p class="context-line"><span class="signal-dot"></span> La Libertad · Inclusión financiera y resiliencia</p><h1>{{ view === 'Territorio' ? 'El territorio avisa.' : view === 'Cartera y pérdidas' ? 'Del evento a la exposición financiera.' : view === 'Plan preventivo' ? 'Proteger también es priorizar.' : view === 'Agentes' ? 'La evidencia, antes de la decisión.' : 'Un modelo que se puede cuestionar.' }}</h1><p class="heading-description">{{ view === 'Territorio' ? 'Explora el impacto climático y encuentra los negocios que necesitan llegar preparados.' : view === 'Cartera y pérdidas' ? 'No confundas saldo expuesto, daño al negocio y pérdida crediticia.' : view === 'Plan preventivo' ? 'Compara medidas preventivas con el mismo escenario y un presupuesto limitado.' : view === 'Agentes' ? 'Herramientas locales coordinadas, resultados trazables y una persona al control.' : 'Supuestos visibles. Incertidumbre medible. Sin promesas de predicción validada.' }}</p></div><button class="button secondary" :disabled="!result || busy || dirty" @click="exportCSV"><UIcon name="i-lucide-download" /> Exportar escenario</button></div>

        <section class="scenario-console" aria-label="Configuración del escenario">
          <div class="scenario-label"><UIcon name="i-lucide-sliders-horizontal" /><strong>Laboratorio climático<small>Evento hipotético, no aviso oficial</small></strong></div>
          <label>Amenaza<select v-model="scenario.hazard" aria-label="Amenaza climática"><option v-for="h in hazards" :key="h">{{ h }}</option></select></label>
          <label>Distrito<select v-model="district" aria-label="Filtrar distrito"><option>Todos</option><option v-for="d in [...new Set(portfolio.map(c => c.district))]" :key="d">{{ d }}</option></select></label>
          <label>Segmento<select v-model="segment" aria-label="Filtrar segmento"><option>Todos</option><option v-for="s in segments" :key="s">{{ s }}</option></select></label>
          <label class="intensity-control"><span>Intensidad <b>{{ scenario.intensity }}%</b></span><input v-model.number="scenario.intensity" type="range" min="0" max="100" step="5" aria-label="Intensidad climática"></label>
          <label>Ventana de amenaza<select v-model.number="scenario.days" aria-label="Ventana de amenaza"><option :value="7">7 días</option><option :value="30">30 días</option><option :value="90">90 días</option></select></label>
          <button class="button primary run-button" :disabled="busy" @click="run"><UIcon :name="busy ? 'i-lucide-loader-circle' : 'i-lucide-play'" :class="{ spinning: busy }" />{{ busy ? 'Calculando…' : 'Ejecutar escenario' }}</button>
        </section>
        <div class="execution-status" aria-live="polite"><span><span class="signal-dot" :class="{ pending: busy || dirty }"></span>{{ busy ? 'Motor local ejecutando simulaciones. Se mantienen visibles los últimos resultados.' : dirty ? 'Parámetros modificados: ejecuta el escenario para actualizar resultados.' : result ? `${result.scenario.paths.toLocaleString('es-PE')} trayectorias calculadas · Semilla ${result.scenario.seed} · ${elapsed} ms` : 'Preparando motor de escenarios…' }}</span><span>Datos sintéticos <UIcon name="i-lucide-flask-conical" /></span></div>
        <div v-if="error" class="notice error-notice" role="alert">{{ error }}<button @click="run">Reintentar</button></div>
        <div v-if="message" class="notice" role="status">{{ message }}<button aria-label="Cerrar confirmación" @click="message = ''"><UIcon name="i-lucide-x" /></button></div>
        <div v-if="dirty && result" class="notice warning-notice">Resultados aún corresponden a {{ result.scenario.hazard.toLowerCase() }}, intensidad {{ result.scenario.intensity }}%, ventana {{ result.scenario.days }} días y presupuesto {{ money(result.budget) }}. Guardar y exportar están bloqueados hasta recalcular.</div>

        <template v-if="result">
          <div v-if="!ranked.length && view !== 'Modelos y fuentes'" class="empty-panel"><UIcon name="i-lucide-map-pin-off" /><h2>No hay clientes en esta combinación.</h2><p>La cartera sintética no contiene ese segmento en el distrito seleccionado.</p><button class="button primary" @click="district = 'Todos'; segment = 'Todos'">Restablecer filtros</button></div>

          <template v-else-if="view === 'Territorio'">
            <section class="territory-workspace">
              <div class="map-workbench">
                <div class="map-heading"><div><h2>Geografía de la vulnerabilidad</h2><span>{{ result.scenario.hazard }} · {{ result.scenario.intensity }}% de intensidad · {{ ranked.length }} clientes</span></div><label class="heat-check"><input v-model="heat" type="checkbox"> Mapa de calor</label></div>
                <div class="map-layer-controls" aria-label="Variable del mapa"><button :class="{ active: layer === 'damage' }" :aria-pressed="layer === 'damage'" @click="layer = 'damage'">Daño al negocio</button><button :class="{ active: layer === 'payment' }" :aria-pressed="layer === 'payment'" @click="layer = 'payment'">Presión de pago</button></div>
                <ExposureMap :items="ranked" :selected="chosen?.client.id ?? ''" :layer="layer" :heat="heat" @select="selectedId = $event" />
                <div class="map-bottomline"><span><UIcon name="i-lucide-info" /> Puntos ficticios sobre mapa real. La exposición no implica incumplimiento.</span><button @click="view = 'Modelos y fuentes'">Ver límites del modelo</button></div>
              </div>
              <aside class="territory-intelligence" aria-label="Resumen del escenario">
                <div class="intelligence-title"><UIcon name="i-lucide-radar" /><span>Lectura del territorio</span><small>Simulada</small></div>
                <div class="territory-number"><span>Daño económico al negocio</span><strong>{{ compact(result.before.damage) }}</strong><p>Media simulada de activos afectados. No es pérdida crediticia.</p></div>
                <div class="territory-pair"><div><strong>{{ highPriority }}<small>/ {{ ranked.length }}</small></strong><span>Prioridad alta de atención</span></div><div><strong>{{ compact(exposed.reduce((s, r) => s + r.client.balance, 0)) }}</strong><span>Saldo en negocios con daño ≥2%</span></div></div>
                <div class="institution-exposure"><span>Pérdida crediticia supuesta</span><strong>{{ compact(result.before.expectedLoss) }}</strong><p>Rango P10–P90 <b>{{ compact(result.before.p10) }} — {{ compact(result.before.p90) }}</b></p><button @click="view = 'Cartera y pérdidas'">Explorar distribución <UIcon name="i-lucide-chart-column" /></button></div>
                <div class="preventive-signal"><UIcon name="i-lucide-shield-check" /><div><strong>{{ result.plan.ids.length }} medidas dentro del presupuesto</strong><p>Compara cuánto daño podrían evitar.</p><button @click="view = 'Plan preventivo'">Preparar intervención</button></div></div>
              </aside>
            </section>

            <div class="cases-layout">
              <section class="case-list-panel"><div class="section-title"><h2>A quién atender primero</h2><span>Por probabilidad de flujo insuficiente</span></div><label class="search-field"><UIcon name="i-lucide-search" /><input v-model="search" type="search" placeholder="Buscar cliente, código o distrito" aria-label="Buscar cliente"></label><div class="client-list"><button v-for="r in listed" :key="r.client.id" class="client-row" :class="{ selected: chosen?.client.id === r.client.id }" :aria-pressed="chosen?.client.id === r.client.id" @click="selectedId = r.client.id"><span class="client-avatar"><UIcon :name="r.client.sector === 'Agricultura' ? 'i-lucide-sprout' : r.client.sector === 'Manufactura' ? 'i-lucide-factory' : 'i-lucide-store'" /></span><span class="client-name"><strong>{{ r.client.name }}</strong><small>{{ r.client.id }} · {{ r.client.district }}</small></span><span class="client-prob">{{ pct(r.shortfall) }}<small>flujo insuficiente</small></span><span class="risk-label" :class="levelClass(r.level)">{{ r.level }}</span></button><div v-if="!listed.length" class="list-empty">No hay coincidencias. <button @click="search = ''">Limpiar búsqueda</button></div></div></section>
              <section v-if="chosen" class="client-dossier"><div class="section-title"><span class="dossier-code">{{ chosen.client.id }} / Expediente preventivo</span><span class="risk-label" :class="levelClass(chosen.level)">Prioridad {{ chosen.level.toLowerCase() }}</span></div><h2>{{ chosen.client.name }}</h2><p>{{ chosen.client.sector }} · {{ chosen.client.segment }} · {{ chosen.client.district }}</p><div class="transmission-chain"><div><UIcon name="i-lucide-cloud-rain" /><strong>{{ chosen.closedDays.toFixed(1) }} días</strong><span>Cierre medio simulado</span></div><UIcon name="i-lucide-chevron-right" /><div><UIcon name="i-lucide-trending-down" /><strong>−{{ pct(chosen.revenueDrop) }}</strong><span>Ingresos del mes</span></div><UIcon name="i-lucide-chevron-right" /><div><UIcon name="i-lucide-wallet" /><strong>{{ chosen.coverage.toFixed(2) }}×</strong><span>Cobertura media</span></div></div><div class="dossier-financials"><span>Saldo <b>{{ money(chosen.client.balance) }}</b></span><span>Obligaciones / mes <b>{{ money(chosen.client.payment + chosen.client.otherDebt) }}</b></span><span>Incluye otras entidades <b>{{ money(chosen.client.otherDebt) }}</b></span><span>Atraso al corte <b>{{ chosen.client.arrears }} días</b></span></div><p class="dossier-explanation"><UIcon name="i-lucide-scan-line" />{{ pct(chosen.shortfall) }} de trayectorias tienen flujo insuficiente. Es una señal para revisar liquidez y continuidad, no una predicción de mora.</p><div class="dossier-actions"><button class="button primary" @click="view = 'Agentes'">Revisar alerta <UIcon name="i-lucide-arrow-up-right" /></button><button class="text-button" @click="view = 'Plan preventivo'">Ver prevención</button></div></section>
            </div>
          </template>

          <template v-else-if="view === 'Cartera y pérdidas'">
            <section class="financial-ribbon"><div><span>Saldo analizado</span><strong>{{ compact(balance) }}</strong><small>{{ ranked.length }} clientes sintéticos</small></div><div><span>Pérdida crediticia base</span><strong>{{ compact(result.before.baseLoss) }}</strong><small>Sin daño climático · misma LGD</small></div><div><span>Incremento por estrés</span><strong class="danger-text">+{{ compact(result.before.expectedLoss - result.before.baseLoss) }}</strong><small>Sensibilidad del resultado antes de impuestos*</small></div><div><span>Con plan preventivo</span><strong class="positive-text">{{ compact(result.after.expectedLoss) }}</strong><small>Efectividad supuesta de medidas</small></div></section>
            <div class="analysis-charts"><section class="chart-panel"><div class="section-title"><h2>Una pérdida, muchas trayectorias</h2><span>{{ result.scenario.paths.toLocaleString('es-PE') }} simulaciones</span></div><p>Distribución de pérdida esperada condicional, no de impagos realizados.</p><LossDistribution :values="result.before.losses" :p10="result.before.p10" :p90="result.before.p90" :mean="result.before.expectedLoss" /></section><section class="chart-panel"><div class="section-title"><h2>Qué cambia cuando prevenimos</h2><span>Mismos números aleatorios</span></div><p>Base → impacto del escenario → residual después del plan.</p><LossBridge :base="result.before.baseLoss" :stress="result.before.expectedLoss" :after="result.after.expectedLoss" /><div class="chart-foot">Costo de intervención separado: <b>{{ money(result.plan.cost) }}</b>. No es ahorro garantizado.</div></section></div>
            <div class="stress-method-bar"><UIcon name="i-lucide-calculator" /><p><strong>EL = PD supuesta × LGD × saldo.</strong> Logit no entrenado · Capacidad de pago a 30 días · LGD {{ pct(result.scenario.lgd) }}. *Si el incremento se reconociera como gasto; no duplica pérdidas reconocidas ni calcula provisiones.</p></div>
            <section class="segment-panel"><div class="section-title"><h2>Concentración por segmento</h2><span>La misma cartera que ves en el mapa</span></div><div class="table-overflow"><table><caption class="sr-only">Exposición y pérdida esperada por segmento crediticio</caption><thead><tr><th>Segmento</th><th>Clientes</th><th>Saldo</th><th>Pérdida de estrés</th><th>Prioridad alta</th><th>Concentración de pérdida</th></tr></thead><tbody><tr v-for="r in segmentRows" :key="r.name"><th scope="row">{{ r.name }}</th><td>{{ r.count }}</td><td>{{ money(r.balance) }}</td><td>{{ money(r.loss) }}</td><td>{{ r.pressure }}</td><td><span class="table-bar"><i :style="{ width: `${r.loss / Math.max(1, result.before.expectedLoss) * 100}%` }"></i></span> {{ pct(r.loss / Math.max(1, result.before.expectedLoss)) }}</td></tr></tbody></table></div></section>
            <div class="notice warning-notice">El rango P10–P90 refleja los supuestos del simulador, no precisión predictiva. No es un intervalo de confianza de una estimación empírica ni VaR regulatorio.</div>
          </template>

          <template v-else-if="view === 'Plan preventivo'">
            <section class="prevention-layout"><div class="budget-panel"><span class="panel-symbol"><UIcon name="i-lucide-shield-check" /></span><h2>Tu presupuesto tiene un destino.</h2><p>Elige cuánto invertir. El planificador busca la combinación que más daño al negocio evita dentro de ese límite.</p><label>Presupuesto disponible <strong>{{ money(budget) }}</strong><input v-model.number="budget" type="range" min="0" max="50000" step="1000" aria-label="Presupuesto preventivo"></label><button class="button primary" :disabled="busy" @click="run">Recalcular plan</button><div class="budget-meter"><span :style="{ width: `${result.budget ? result.plan.cost / result.budget * 100 : 0}%` }"></span></div><div class="budget-breakdown"><span>Asignado <b>{{ money(result.plan.cost) }}</b></span><span>Disponible <b>{{ money(result.budget - result.plan.cost) }}</b></span></div><small>Una intervención por cliente · Costos en múltiplos de S/ 100 · Sin financiación automática.</small></div><div class="prevention-evidence"><div class="financial-ribbon compact-ribbon"><div><span>Negocios a proteger</span><strong>{{ result.plan.ids.length }}</strong><small>{{ planDistricts }} distritos · {{ planSectors }} segmentos</small></div><div><span>Daño al negocio evitado</span><strong class="positive-text">{{ compact(result.before.damage - result.after.damage) }}</strong><small>Efectividad hipotética, no garantía</small></div></div><section class="chart-panel"><h2>Antes y después de intervenir</h2><div class="intervention-comparison"><div><span>Sin medidas</span><strong>{{ money(result.before.damage) }}</strong><i style="width:100%"></i></div><div><span>Con el plan</span><strong>{{ money(result.after.damage) }}</strong><i class="residual" :style="{ width: `${result.after.damage / Math.max(1, result.before.damage) * 100}%` }"></i></div></div><p>Costo <b>{{ money(result.plan.cost) }}</b> separado de las pérdidas. El plan no implica desembolso ni cambios contractuales.</p></section><div class="notice warning-notice"><UIcon name="i-lucide-scale" /> El objetivo monetario puede favorecer activos de mayor valor. La cobertura territorial y por segmento se informa, pero no se garantiza. Debe revisarse antes de aprobar.</div></div></section>
            <section class="segment-panel"><div class="section-title"><h2>Intervenciones propuestas</h2><span>Revisión humana requerida</span></div><div v-if="!planRows.length" class="list-empty">No hay medidas financiables con este presupuesto o beneficio positivo. Aumenta el presupuesto y recalcula.</div><div v-else class="table-overflow"><table><thead><tr><th>Cliente</th><th>Distrito</th><th>Medida propuesta</th><th>Costo</th><th>Revisión</th></tr></thead><tbody><tr v-for="r in planRows" :key="r.client.id"><th scope="row"><button class="table-link" @click="selectedId = r.client.id; view = 'Agentes'">{{ r.client.name }}<small>{{ r.client.id }}</small></button></th><td>{{ r.client.district }}</td><td>{{ measure(r.client.sector, result.scenario.hazard) }}</td><td>{{ money(r.client.cost) }}</td><td><span class="risk-label" :class="hasReview(r.client.id) ? 'low' : 'moderate'">{{ hasReview(r.client.id) ? 'Revisado localmente' : 'Pendiente' }}</span></td></tr></tbody></table></div></section>
          </template>

          <template v-else-if="view === 'Agentes'">
            <div class="agent-workspace"><section class="agent-trace"><div class="section-title"><h2>Del dato a la acción, con trazabilidad</h2><span>CE-1.0</span></div><p>Esta ejecución usa agentes locales deterministas. No hay un LLM conectado ni razonamiento generado libremente.</p><ol><li v-for="(step, i) in result.trace" :key="step.name"><span class="agent-step-index">{{ i + 1 }}</span><div><div class="agent-step-title"><h3>{{ step.name }}</h3><span class="risk-label" :class="step.status === 'ok' ? 'low' : 'moderate'">{{ step.status === 'ok' ? 'Ejecutado' : 'Con advertencias' }}</span></div><code>{{ step.tool }}</code><p>{{ step.evidence }}</p></div></li></ol><div class="trace-signature"><UIcon name="i-lucide-fingerprint" /><span>Escenario: {{ result.fingerprint }}<br>Duración observada: {{ elapsed }} ms · Sin datos enviados a un modelo externo.</span></div></section>
              <section v-if="chosen" class="human-review"><div class="review-heading"><UIcon name="i-lucide-user-check" /><span>Tu revisión cierra el circuito</span></div><label>Cliente<select v-model="selectedId" aria-label="Cliente para revisión"><option v-for="r in ranked" :key="r.client.id" :value="r.client.id">{{ r.client.id }} · {{ r.client.name }}</option></select></label><h2>{{ chosen.client.name }}</h2><span class="risk-label" :class="reviewed ? 'low' : levelClass(chosen.level)">{{ reviewed ? 'Revisado en este escenario' : `Prioridad ${chosen.level.toLowerCase()}` }}</span><p class="review-summary">{{ pct(chosen.shortfall) }} de trayectorias con insuficiencia de flujo. Daño medio: {{ money(chosen.damage) }}. {{ result.plan.ids.includes(chosen.client.id) ? 'Incluido en el plan preventivo.' : 'Sin medida asignada en este presupuesto.' }}</p><div class="review-task"><strong>Acción a validar con el asesor</strong><p>{{ measure(chosen.client.sector, result.scenario.hazard) }}. Verificar reserva de liquidez, factibilidad y consentimiento antes del contacto.</p></div><label>Evidencia de revisión <small>Mínimo 8 caracteres · No ingreses datos personales reales.</small><textarea v-model="note" maxlength="500" rows="3" placeholder="Ej.: validar costo y reserva con el asesor antes de intervenir." aria-label="Evidencia de revisión"></textarea></label><button class="button primary" :disabled="note.trim().length < 8 || busy || dirty" @click="review"><UIcon name="i-lucide-check-check" /> Registrar revisión humana</button><small class="storage-note">{{ storageAvailable ? 'Se guarda únicamente en este navegador. No es una auditoría institucional.' : 'Almacenamiento bloqueado: los registros solo duran esta sesión.' }}</small><details class="review-history"><summary>Historial local ({{ reviews.filter(r => r.id === chosen?.client.id).length }})</summary><p v-for="(r, i) in reviews.filter(r => r.id === chosen?.client.id).slice(-5).reverse()" :key="i"><b>{{ new Date(r.date).toLocaleString('es-PE') }}</b><br>{{ r.note }}<small>Escenario {{ r.fingerprint }}</small></p></details></section>
            </div>
          </template>

          <template v-else>
            <section class="model-position"><UIcon name="i-lucide-flask-conical" /><div><h2>Prototipo funcional. Evidencia sintética.</h2><p>Las simulaciones, la interpolación del mapa, la optimización y el registro local sí se ejecutan. Ningún resultado representa una PD calibrada, un aviso meteorológico oficial o una decisión de Caja Trujillo.</p><p>Prioridad alta: flujo insuficiente en ≥25% de trayectorias; moderada: ≥10% y &lt;25%; baja: &lt;10%. Son umbrales ilustrativos, no políticas de Caja Trujillo.</p></div></section>
            <section class="model-comparison"><h2>Qué modelos elegimos y por qué</h2><div class="table-overflow"><table><thead><tr><th>Método</th><th>Aporta</th><th>Estado</th><th>Validación necesaria</th></tr></thead><tbody><tr><th>Beta–Bernoulli</th><td>Incertidumbre sobre frecuencia de eventos; prior Beta(2,8).</td><td><span class="risk-label low">Implementado</span></td><td>Históricos binarios representativos; sensibilidad al prior.</td></tr><tr><th>Monte Carlo correlacionado</th><td>Propaga daño, caída de ingresos y presión de pago.</td><td><span class="risk-label low">Implementado</span></td><td>Curvas de daño, dependencias y backtesting por evento.</td></tr><tr><th>Función logística de estrés</th><td>Relaciona flujo, daño, atrasos y otras deudas con PD supuesta.</td><td><span class="risk-label moderate">No entrenada</span></td><td>Ajustar con etiquetas de incumplimiento a 30 días, Brier y calibración temporal.</td></tr><tr><th>Mochila 0/1</th><td>Maximiza daño al negocio evitado bajo presupuesto.</td><td><span class="risk-label low">Implementado</span></td><td>Efectividad causal, costos y restricciones de equidad.</td></tr><tr><th>Gradient boosting / supervivencia</th><td>No linealidad y tiempo hasta deterioro.</td><td><span class="risk-label neutral">Evaluación futura</span></td><td>Requiere volumen, censura, etiquetas y evaluación temporal; no se inventa precisión.</td></tr></tbody></table></div></section>
            <div class="method-columns"><section class="chart-panel"><h2>Parámetros reproducibles</h2><label>Trayectorias<select v-model.number="scenario.paths" aria-label="Cantidad de trayectorias"><option :value="500">500</option><option :value="1500">1,500</option><option :value="5000">5,000</option></select></label><label>Semilla<input v-model.number="scenario.seed" type="number" min="1" max="2147483647" aria-label="Semilla de simulación"></label><label>LGD supuesta <b>{{ pct(scenario.lgd) }}</b><input v-model.number="scenario.lgd" type="range" min="0" max="1" step=".05" aria-label="Pérdida dado incumplimiento"></label><button class="button primary" :disabled="busy" @click="run">Aplicar y recalcular</button><p>Ventana climática: {{ result.scenario.days }} días. Ingresos y capacidad de pago: próximo mes (30 días). El tamaño de la ventana altera la probabilidad del evento, no el horizonte de PD.</p></section><section class="chart-panel"><h2>Factores del logit supuesto</h2><p>Ejemplo central de {{ chosen?.client.name ?? 'la cartera' }}. El cálculo por trayectoria se promedia después del enlace logístico; este ejemplo no reconstruye esa media.</p><div v-for="f in selectedLogit?.features ?? []" :key="f.label" class="factor-row"><span>{{ f.label }}</span><b>{{ f.contribution.toFixed(2) }}</b></div><p>logit = −3.8 + 2.1 × déficit de cobertura + 2.4 × daño relativo + 1.1 × atraso/30 + 0.7 × proporción de otras obligaciones.</p></section></div>
            <section class="sources-panel"><h2>Fuentes y límites de uso</h2><div class="source-entries"><article><h3>Cartera y ubicación</h3><span class="risk-label moderate">Sintéticos</span><p>60 clientes, cinco segmentos. Coordenadas ficticias cerca de centros distritales. No hay datos personales ni conexión a Neon.</p></article><article><h3>SENAMHI / CENEPRED / INDECI</h3><span class="risk-label neutral">No integrados</span><p>Fuentes previstas. Se debe verificar vigencia, geometrías, licencias y trazabilidad. Cartera mínimo mensual; amenaza según vigencia.</p><a href="https://www.senamhi.gob.pe/" target="_blank" rel="noopener noreferrer">Consultar SENAMHI</a></article><article><h3>Mapa y marca</h3><span class="risk-label low">Recursos identificados</span><p>Mapa base OpenStreetMap; necesita internet y carga mosaicos externos. Logos descargados del sitio oficial de Cajathon. No implica aval institucional.</p><a href="https://cajathon.cajatrujillo.com.pe/" target="_blank" rel="noopener noreferrer">Cajathon oficial</a></article></div></section>
            <div class="notice warning-notice"><UIcon name="i-lucide-shield-alert" /> Producción requiere permisos por rol, consentimiento, datos protegidos, auditoría institucional y evaluación de sesgos por zona, sector y segmento. La ubicación no se usa directamente en el logit crediticio.</div>
          </template>
        </template>
        <div v-else-if="!error" class="initial-loading" role="status"><UIcon class="spinning" name="i-lucide-loader-circle" /><h2>Construyendo el primer escenario</h2><p>El motor se ejecuta en tu navegador, sin enviar información financiera.</p></div>

        <footer class="product-footer"><span><UIcon name="i-lucide-shield-check" /> CajaEscudo <small>Anticipar para proteger.</small></span><p>RIE-01 · Prototipo de prueba · Sin decisiones crediticias automáticas</p><button @click="view = 'Modelos y fuentes'">Supuestos y fuentes</button></footer>
      </main>

      <div v-if="tour" class="tour-backdrop" @click.self="tour = false"><section ref="tourDialog" class="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title" @keydown="trapTour" @keydown.esc="tour = false"><button class="tour-close" aria-label="Cerrar recorrido" @click="tour = false"><UIcon name="i-lucide-x" /></button><span class="tour-progress">Recorrido de demostración · {{ tourStep + 1 }} de {{ tourSteps.length }}</span><h2 id="tour-title">{{ tourSteps[tourStep]?.title }}</h2><p>{{ tourSteps[tourStep]?.body }}</p><div><button class="button secondary" @click="tour = false">Explorar esta vista</button><button class="button primary" @click="advanceTour">{{ tourStep === tourSteps.length - 1 ? 'Terminar recorrido' : 'Siguiente' }}</button></div></section></div>
    </div>
  </UApp>
</template>
