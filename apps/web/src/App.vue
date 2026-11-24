<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import RiskMap from './components/RiskMap.vue'
import { businesses } from './domain/data'
import { assess, money, simulate, type Hazard } from './domain/risk'

type View = 'Panorama de riesgo' | 'Negocios y activos' | 'Simulador de cuotas' | 'Fuentes y metodología'
const view = ref<View>('Panorama de riesgo')
const navigation: { label: View; icon: string }[] = [
  { label: 'Panorama de riesgo', icon: 'i-lucide-map' },
  { label: 'Negocios y activos', icon: 'i-lucide-store' },
  { label: 'Simulador de cuotas', icon: 'i-lucide-chart-no-axes-combined' },
  { label: 'Fuentes y metodología', icon: 'i-lucide-database' },
]
const hazard = ref<Hazard>('Lluvias intensas')
const horizon = ref(72)
const intensity = ref(85)
const district = ref('Todos los distritos')
const search = ref('')
const heat = ref(true)
const selectedId = ref('B01')
const protectedIds = ref<string[]>([])
const saved = ref<string[]>([])
const notification = ref('')
const detailOpen = ref(false)
const tea = ref(26)
const months = ref(12)
const shock = ref(30)
const scenario = computed(() => ({ hazard: hazard.value, horizon: horizon.value, intensity: intensity.value }))
const ranked = computed(() => businesses.map(b => assess(b, scenario.value)).sort((a, b) => b.loss - a.loss))
const filtered = computed(() => ranked.value.filter(b => (district.value === 'Todos los distritos' || b.district === district.value) && `${b.name} ${b.owner}`.toLowerCase().includes(search.value.toLowerCase())))
const original = computed(() => businesses.find(b => b.id === selectedId.value)!)
const selected = computed(() => assess(original.value, scenario.value, protectedIds.value))
const before = computed(() => assess(original.value, scenario.value))
const totalLoss = computed(() => filtered.value.reduce((s, b) => s + b.loss, 0))
const totalAssets = computed(() => filtered.value.reduce((s, b) => s + b.total, 0))
const highRisk = computed(() => filtered.value.filter(b => b.level === 'Alto').length)
const preventionCost = computed(() => selected.value.assets.filter(a => a.protected).reduce((s, a) => s + a.cost, 0))
const simulation = computed(() => simulate(original.value, selected.value.loss, tea.value, months.value, shock.value))
const districts = ['Todos los distritos', 'Trujillo', 'El Porvenir', 'Laredo', 'La Esperanza', 'Huanchaco']
const monthsLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
const chartMax = computed(() => Math.max(...simulation.value.schedule.map(r => Math.max(r.flow, r.payment, r.flexible)), 1))
watch([filtered, view], ([list, currentView]) => {
  if (currentView !== 'Simulador de cuotas' && list.length && !list.some(b => b.id === selectedId.value)) selectedId.value = list[0]!.id
})
watch([selectedId, view, hazard, horizon, intensity, tea, months, shock, protectedIds], () => { notification.value = '' }, { deep: true })
function selectBusiness(id: string) { selectedId.value = id }
function toggleAsset(id: string) { protectedIds.value = protectedIds.value.includes(id) ? protectedIds.value.filter(a => a !== id) : [...protectedIds.value, id] }
function savePlan() {
  const key = `${selectedId.value}:${protectedIds.value.filter(id => id.startsWith(selectedId.value)).sort().join(',')}`
  if (!saved.value.includes(key)) saved.value.push(key)
  notification.value = `Plan de ${selected.value.name} guardado en esta sesión. No se ha enviado al cliente.`
}
function exportReport() {
  const isSimulation = view.value === 'Simulador de cuotas'
  const rows = isSimulation
    ? [['Negocio', 'Mes', 'Flujo PEN', 'Cuota uniforme PEN', 'Cuota adaptable PEN', 'Intereses PEN', 'Saldo PEN', 'TEA %', 'Datos'], ...simulation.value.schedule.map(r => [original.value.name, r.month, r.flow.toFixed(2), r.payment.toFixed(2), r.flexible.toFixed(2), r.interest.toFixed(2), r.balance.toFixed(2), tea.value, 'Sintéticos'])]
    : [['Negocio', 'Distrito', 'Nivel', 'Activos PEN', 'Perdida estimada PEN', 'Escenario', 'Horizonte horas', 'Datos'], ...filtered.value.map(b => [b.name, b.district, b.level, b.total.toFixed(2), b.loss.toFixed(2), hazard.value, horizon.value, 'Sintéticos'])]
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = isSimulation ? 'cauce-cronograma-simulado.csv' : 'cauce-riesgo-simulado.csv'; a.click(); URL.revokeObjectURL(url)
  notification.value = 'Reporte de datos sintéticos exportado.'
}
function reviewProposal() {
  notification.value = simulation.value.feasible
    ? 'Propuesta registrada para revisión en esta sesión. Requiere validación crediticia y consentimiento del cliente.'
    : 'No se puede proponer este cronograma: supera la capacidad de pago o no cubre los intereses en algún mes.'
}
</script>

<template>
  <UApp>
    <div class="workspace">
      <aside class="sidebar">
        <a class="brand" href="#" aria-label="Cauce, inicio" @click.prevent="view = 'Panorama de riesgo'"><span class="brand-symbol"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 9C13 2 20 16 27 8M6 17C13 10 20 24 27 16M6 25C13 18 20 32 27 24" /></svg></span><span>cauce<span class="brand-dot">.</span></span></a>
        <div class="workspace-label">Inteligencia para la resiliencia</div>
        <div class="institution"><span class="caja-mark">caja<span>trujillo</span></span><span>Espacio de trabajo<small>Equipo de negocios</small></span><UIcon name="i-lucide-chevrons-up-down" /></div>
        <nav aria-label="Navegación principal"><button v-for="item in navigation" :key="item.label" :aria-label="item.label" :class="{ active: view === item.label }" :aria-current="view === item.label ? 'page' : undefined" @click="view = item.label"><UIcon :name="item.icon" /><span>{{ item.label }}</span><i v-if="item.label === 'Panorama de riesgo'" class="nav-dot"></i></button></nav>
        <div class="sidebar-note"><span class="note-icon"><UIcon name="i-lucide-shield-check" /></span><strong>Anticiparse es proteger.</strong><p>Del riesgo climático a un negocio que puede seguir adelante.</p><button @click="view = 'Fuentes y metodología'">Conoce el modelo <UIcon name="i-lucide-arrow-up-right" /></button></div>
        <div class="sidebar-bottom"><span class="demo-dot"></span> Entorno de demostración</div>
        <div class="profile"><span class="avatar">LR</span><div><strong>Luis Ramírez</strong><small>Analista de negocios</small></div><UIcon name="i-lucide-shield-user" /></div>
      </aside>
      <main>
        <header class="topbar"><div><span>Gestión preventiva</span><UIcon name="i-lucide-chevron-right" /><strong>{{ view }}</strong></div><div class="topbar-right"><span class="demo-pill"><span></span> Datos sintéticos</span><UButton icon="i-lucide-circle-help" color="neutral" variant="ghost" aria-label="Ver metodología y ayuda" @click="view = 'Fuentes y metodología'" /><span class="avatar small">LR</span></div></header>
        <div class="page-content">
          <div class="page-heading"><div><div class="page-context"><span class="live-dot"></span> Cartera La Libertad</div><h1>{{ view === 'Panorama de riesgo' ? 'Anticipa el riesgo. Protege el negocio.' : view }}</h1><p>{{ view === 'Panorama de riesgo' ? 'Identifica la exposición de tus clientes y actúa antes de que el clima afecte sus ingresos.' : view === 'Negocios y activos' ? 'Cada activo tiene un valor. Protege primero donde puedes evitar una mayor pérdida.' : view === 'Simulador de cuotas' ? 'Explora un cronograma que acompañe la recuperación del negocio, sin ocultar sus costos.' : 'Decisiones explicables, supuestos visibles y personas al control.' }}</p></div><UButton v-if="view !== 'Fuentes y metodología'" icon="i-lucide-download" color="neutral" variant="outline" class="export-button" @click="exportReport">Exportar reporte</UButton></div>
          <div v-if="notification" class="feedback" role="status"><UIcon name="i-lucide-info" />{{ notification }}<button aria-label="Cerrar mensaje" @click="notification = ''"><UIcon name="i-lucide-x" /></button></div>

          <template v-if="view === 'Panorama de riesgo' || view === 'Negocios y activos'">
            <div class="scenario-bar">
              <div class="scenario-title"><UIcon name="i-lucide-cloud-rain" /><div><strong>Escenario climático</strong><span>Explora un evento hipotético</span></div></div>
              <label>Evento<USelect v-model="hazard" :items="['Lluvias intensas', 'Inundación', 'Sequía']" class="event-select" aria-label="Evento climático" /></label>
              <label>Zona<USelect v-model="district" :items="districts" class="district-select" aria-label="Distrito" /></label>
              <div class="horizon-control"><span>Horizonte</span><div class="segmented" aria-label="Horizonte del escenario"><button v-for="h in [24, 48, 72]" :key="h" :class="{ active: horizon === h }" :aria-pressed="horizon === h" @click="horizon = h">{{ h }} h</button></div></div>
              <label class="intensity-label">Intensidad <strong>{{ intensity }}%</strong><input v-model.number="intensity" type="range" min="20" max="100" step="5" aria-label="Intensidad del escenario" /></label>
            </div>
            <section class="metrics" aria-label="Resumen de la cartera filtrada">
              <div><span>Negocios en el escenario <UIcon name="i-lucide-store" /></span><strong>{{ filtered.length.toString().padStart(2, '0') }}<small>negocios</small></strong><p>En {{ district === 'Todos los distritos' ? '5 distritos de La Libertad' : district }}</p></div>
              <div><span>Prioridad alta <UIcon name="i-lucide-triangle-alert" /></span><strong class="risk-text-alto">{{ highRisk.toString().padStart(2, '0') }}<small>requieren atención</small></strong><p>Exposición estimada ≥ 40% del valor</p></div>
              <div><span>Pérdida esperada del escenario <UIcon name="i-lucide-chart-no-axes-column-increasing" /></span><strong>{{ money(totalLoss) }}</strong><p>Estimación, no pérdida confirmada</p></div>
              <div><span>Valor de activos analizados <UIcon name="i-lucide-boxes" /></span><strong>{{ money(totalAssets) }}</strong><p>{{ filtered.length * 3 }} activos con valorización referencial</p></div>
            </section>
          </template>

          <template v-if="view === 'Panorama de riesgo'">
            <div class="section-heading"><div><h2>Un territorio, distintas vulnerabilidades</h2><p>Selecciona un negocio para entender qué está en riesgo.</p></div><label class="heat-toggle"><USwitch v-model="heat" aria-label="Mostrar mapa de calor" /> Mapa de calor</label></div>
            <section class="map-layout">
              <RiskMap :items="filtered" :selected="selectedId" :heat="heat" @select="selectBusiness" />
              <div class="priority-panel"><div class="priority-heading"><h3>Prioridad de atención</h3><UBadge color="neutral" variant="soft" size="sm">{{ filtered.length }}</UBadge></div><p>Ordenados por mayor pérdida esperada</p><UInput v-model="search" icon="i-lucide-search" placeholder="Buscar negocio o cliente" aria-label="Buscar negocio o cliente" class="business-search" />
                <div class="priority-list"><button v-for="(b, i) in filtered" :key="b.id" class="priority-row" :class="{ chosen: selectedId === b.id }" :aria-pressed="selectedId === b.id" @click="selectBusiness(b.id)"><span class="priority-rank">{{ String(i + 1).padStart(2, '0') }}</span><span class="priority-business"><strong>{{ b.name }}</strong><span>{{ b.district }} <i></i> {{ b.sector }}</span><b>{{ money(b.loss) }}<small> pérdida estimada</small></b></span><span class="risk-badge" :class="b.level.toLowerCase()">{{ b.level }}</span></button><div v-if="!filtered.length" class="empty-state"><UIcon name="i-lucide-search-x" /><strong>No hay negocios con estos filtros</strong><UButton color="neutral" variant="outline" @click="search = ''; district = 'Todos los distritos'">Limpiar filtros</UButton></div></div>
                <div class="priority-footer"><UIcon name="i-lucide-info" /> La prioridad combina valor, exposición y vulnerabilidad.</div>
              </div>
            </section>
            <section v-if="filtered.length" class="selected-summary"><div class="selected-icon"><UIcon name="i-lucide-store" /></div><div class="selected-copy"><span>Negocio seleccionado</span><h3>{{ selected.name }}</h3><p>{{ selected.owner }} · {{ selected.district }}</p></div><div class="selected-loss"><span>Pérdida esperada</span><strong>{{ money(selected.loss) }}</strong></div><div class="selected-loss"><span>Activo más expuesto</span><strong class="asset-name">{{ selected.assets[0]?.name }}</strong></div><UButton color="primary" icon="i-lucide-shield-check" @click="view = 'Negocios y activos'">Preparar prevención</UButton></section>
            <div class="source-footnote"><span><UIcon name="i-lucide-flask-conical" /> Escenario de demostración. No constituye una alerta oficial.</span><button @click="view = 'Fuentes y metodología'">Fuentes y supuestos <UIcon name="i-lucide-arrow-up-right" /></button></div>
          </template>

          <template v-else-if="view === 'Negocios y activos'">
            <section class="asset-workspace"><div class="business-rail"><h2>Selecciona un negocio</h2><UInput v-model="search" icon="i-lucide-search" placeholder="Buscar negocio" aria-label="Buscar negocio" /><button v-for="b in filtered" :key="b.id" :class="{ chosen: selectedId === b.id }" @click="selectBusiness(b.id)"><strong>{{ b.name }}</strong><span>{{ b.district }}<b :class="`risk-text-${b.level.toLowerCase()}`">{{ money(b.loss) }}</b></span></button><p v-if="!filtered.length">No hay coincidencias. Cambia la búsqueda o el distrito.</p></div>
              <div v-if="filtered.length" class="asset-detail"><div class="detail-title"><div><span class="risk-badge" :class="selected.level.toLowerCase()">Riesgo {{ selected.level.toLowerCase() }}</span><h2>{{ selected.name }}</h2><p>{{ selected.owner }} · {{ selected.sector }} · {{ selected.district }}</p></div><UButton icon="i-lucide-calculator" variant="outline" @click="view = 'Simulador de cuotas'">Simular cuotas</UButton></div>
                <div class="prevention-overview"><div><span>Sin medidas</span><strong>{{ money(before.loss) }}</strong><small>Pérdida esperada</small></div><UIcon name="i-lucide-arrow-right" /><div><span>Con tu estrategia</span><strong class="teal-text">{{ money(selected.loss) }}</strong><small>Pérdida residual estimada</small></div><div><span>Costo preventivo</span><strong>{{ money(preventionCost) }}</strong><small>No incluye financiamiento</small></div></div>
                <h3 class="asset-section-title">Protege lo que mantiene el negocio en marcha</h3><p>Acciones ordenadas por pérdida esperada residual. Marca las medidas que deseas evaluar.</p>
                <article v-for="asset in selected.assets" :key="asset.id" class="asset-row"><div class="asset-row-top"><span class="asset-icon"><UIcon :name="asset.name.includes('Local') ? 'i-lucide-building-2' : asset.name.includes('Cultivos') ? 'i-lucide-sprout' : 'i-lucide-package'" /></span><div><h4>{{ asset.name }}</h4><span>Valor {{ money(asset.value) }} · Vulnerabilidad base {{ Math.round(asset.vulnerability * 100) }}%</span></div><div class="asset-loss"><span>Pérdida estimada</span><strong>{{ money(asset.loss) }}</strong></div></div><div class="asset-action"><UCheckbox :model-value="asset.protected" :label="asset.measure" @update:model-value="toggleAsset(asset.id)" /><span>{{ money(asset.cost) }}</span></div></article>
                <div class="asset-actions"><p>Ahorro esperado bruto: <strong>{{ money(before.loss - selected.loss) }}</strong><br><small>No es una garantía de recuperación.</small></p><UButton icon="i-lucide-bookmark-check" :disabled="!selected.assets.some(a => a.protected)" @click="savePlan">Guardar plan preventivo</UButton></div>
              </div><div v-else class="empty-state"><UIcon name="i-lucide-search-x" /><strong>No hay negocios con estos filtros</strong><UButton color="neutral" variant="outline" @click="search = ''; district = 'Todos los distritos'">Limpiar filtros</UButton></div></section>
          </template>

          <template v-else-if="view === 'Simulador de cuotas'">
            <div class="simulator-layout"><section class="simulation-controls"><h2>Construye un escenario</h2><label>Negocio<USelect v-model="selectedId" :items="businesses.map(b => ({ label: b.name, value: b.id }))" aria-label="Negocio de la simulación" /></label><div class="loan-summary"><span>Saldo de capital</span><strong>{{ money(original.principal) }}</strong><p>Crédito sintético · sin seguros ni comisiones</p></div><label>Tasa efectiva anual <strong>{{ tea }}%</strong><input v-model.number="tea" type="range" min="0" max="60" aria-label="Tasa efectiva anual" /></label><label>Plazo restante<USelect v-model="months" :items="[6, 12, 18].map(v => ({ label: `${v} meses`, value: v }))" aria-label="Plazo restante" /></label><label>Caída de ingresos inicial <strong>{{ shock }}%</strong><input v-model.number="shock" type="range" min="0" max="80" step="5" aria-label="Caída de ingresos inicial" /><small>Dos meses de afectación y dos de recuperación parcial.</small></label><p class="control-note"><UIcon name="i-lucide-info" /> Escenario: {{ hazard.toLowerCase() }}, {{ horizon }} h. Pérdida residual: {{ money(selected.loss) }}. El primer mes reserva el 6% de esa pérdida para recuperación. Las medidas preventivas no se financian en esta simulación.</p></section>
              <section class="simulation-result"><div class="detail-title"><div><span class="page-context">Simulación orientativa</span><h2>Cuotas al ritmo de {{ original.name }}</h2><p>Mismo capital, tasa y plazo. Distribución distinta del pago.</p></div><UBadge :color="simulation.feasible ? 'success' : 'error'" variant="soft">{{ simulation.feasible ? 'Pasa el filtro de capacidad' : 'Requiere otro escenario' }}</UBadge></div>
                <div class="simulation-kpis"><div><span>Cuota uniforme</span><strong>{{ money(simulation.payment) }}</strong></div><div><span>Primera cuota adaptable</span><strong class="teal-text">{{ money(simulation.schedule[0]!.flexible) }}</strong></div><div><span>Costo adicional del ajuste</span><strong>{{ money(simulation.flexibleTotal - simulation.fixedTotal) }}</strong></div></div>
                <div class="chart-heading"><h3>Flujo disponible y pagos mensuales</h3><div><span><i class="flow-key"></i> Flujo disponible</span><span><i class="flex-key"></i> Cuota adaptable</span><span><i class="fixed-key"></i> Uniforme</span></div></div>
                <div class="cashflow-chart" role="img" aria-label="Comparación de flujo y cuotas. Los valores exactos están en el cronograma inferior."><span class="chart-top-label">{{ money(chartMax) }}</span><div class="chart-grid"><div v-for="(row, i) in simulation.schedule" :key="row.month" class="chart-column"><div class="chart-bars"><div class="flow-bar" :style="{ height: `${row.flow / chartMax * 100}%` }" :title="money(row.flow)"></div><div class="flex-bar" :style="{ height: `${row.flexible / chartMax * 100}%` }" :title="money(row.flexible)"></div></div><span>{{ monthsLabels[i] }}</span></div><div class="fixed-line" :style="{ bottom: `${simulation.payment / chartMax * 100}%` }"></div></div></div>
                <div class="simulation-disclaimer" :class="{ blocked: !simulation.feasible }"><UIcon :name="simulation.feasible ? 'i-lucide-shield-check' : 'i-lucide-triangle-alert'" /><div><strong>{{ simulation.feasible ? 'Un punto de partida, no una aprobación.' : 'El cronograma no cumple el filtro de capacidad.' }}</strong><p>El pago no debe superar el 70% del flujo disponible ni ser menor a los intereses del mes. Umbral ilustrativo, no política de Caja Trujillo.</p></div></div>
                <div class="simulation-bottom"><UButton color="neutral" variant="outline" icon="i-lucide-table-2" @click="detailOpen = true">Ver cronograma y costos</UButton><UButton :disabled="!simulation.feasible" icon="i-lucide-send" @click="reviewProposal">Proponer para revisión</UButton></div>
              </section></div>
          </template>

          <template v-else>
            <section class="method-intro"><div class="method-symbol"><UIcon name="i-lucide-scan-line" /></div><div><h2>La señal climática no es una decisión crediticia.</h2><p>Cauce traduce un escenario de amenaza en pérdidas esperadas de activos y acciones preventivas. La evaluación de cuotas usa, por separado, el flujo disponible del negocio.</p></div></section>
            <div class="sources-grid"><article><div class="source-logo">SENAMHI</div><UBadge color="warning" variant="soft">Integración pendiente</UBadge><h3>Amenazas meteorológicas</h3><p>Fuente prevista para avisos y pronósticos. Se deben validar cobertura geográfica, vigencia, severidad y acceso a los datos.</p><a href="https://www.senamhi.gob.pe/" target="_blank" rel="noopener noreferrer">Consultar sitio oficial <UIcon name="i-lucide-external-link" /></a></article><article><div class="source-logo">INDECI</div><UBadge color="warning" variant="soft">Integración pendiente</UBadge><h3>Contexto de emergencias</h3><p>Fuente prevista para reportes de eventos y afectaciones. Los reportes históricos no se interpretan como probabilidades futuras.</p><a href="https://www.gob.pe/indeci" target="_blank" rel="noopener noreferrer">Consultar sitio oficial <UIcon name="i-lucide-external-link" /></a></article><article><div class="source-logo caja-source">Caja Trujillo</div><UBadge color="info" variant="soft">Datos sintéticos</UBadge><h3>Activos y capacidad de pago</h3><p>12 negocios ficticios y 36 activos referenciales. No se accede a datos personales, expedientes ni sistemas de la institución.</p></article></div>
            <section class="methodology"><h2>Qué calcula este prototipo</h2><details open><summary>Pérdida esperada y prioridad</summary><p>Pérdida por activo = valor de reposición × probabilidad ilustrativa del escenario × vulnerabilidad. La prioridad se ordena por pérdida monetaria; el nivel de riesgo representa la pérdida como porcentaje del valor total (alto ≥ 40%, medio ≥ 20%).</p><p>La probabilidad combina exposición sintética, intensidad, horizonte y sector. No está calibrada: requiere validación con registros históricos, georreferenciación y curvas de daño por amenaza.</p></details><details><summary>Efecto de las medidas preventivas</summary><p>Cada medida reduce la vulnerabilidad en puntos definidos en los datos sintéticos. La pérdida evitada es la diferencia entre el escenario base y el intervenido; el costo preventivo se muestra por separado. No equivale a un beneficio garantizado.</p></details><details><summary>Cuotas adaptables y sostenibilidad financiera</summary><p>La tasa mensual se deriva de la TEA. Las cuotas se ponderan por flujo disponible y se normalizan por valor presente para amortizar el mismo capital en el plazo seleccionado. Se verifica capacidad de pago, cobertura de intereses y saldo final.</p><p>No incluye seguros, comisiones, mora, otros pasivos, tasas contractuales ni evaluación de rentabilidad ajustada por riesgo. Los flujos futuros son supuestos y no un modelo predictivo entrenado.</p></details><details><summary>Camino al prototipo avanzado del desafío</summary><p>Integrar avisos oficiales con fechas y polígonos; cruzar ubicaciones y activos autorizados; calibrar curvas de daño; modelar escenarios de ingresos con incertidumbre; optimizar cuotas bajo restricciones de capacidad, contrato y rentabilidad; validar con asesores antes de cualquier oferta al cliente.</p><p>Este MVP implementa cálculo funcional y trazable, pero no constituye por sí solo un sistema predictivo avanzado validado ni satisface aún todas las exigencias tecnológicas del desafío.</p></details><details><summary>Uso responsable y privacidad</summary><p>La prevención no debe excluir negocios de menor patrimonio. En producción se debe añadir criticidad operativa, costo de intervención y equidad como criterios, además del valor expuesto. Todo cambio contractual requiere revisión humana, consentimiento y cumplimiento normativo.</p></details></section>
          </template>
          <footer class="page-footer"><span>cauce. <span>Un negocio preparado, un futuro más seguro.</span></span><span>Prototipo NEG-01 <i></i> Caja Trujillo</span></footer>
        </div>
      </main>
    </div>
    <UModal v-model:open="detailOpen" title="Cronograma y costos de la simulación" description="Montos orientativos en soles. Sin seguros ni comisiones." :ui="{ content: 'max-w-4xl' }"><template #body><div class="schedule-totals"><p>Total uniforme: <strong>{{ money(simulation.fixedTotal) }}</strong></p><p>Total adaptable: <strong>{{ money(simulation.flexibleTotal) }}</strong></p><p>Intereses adaptables: <strong>{{ money(simulation.flexibleTotal - original.principal) }}</strong></p></div><div class="table-scroll"><table><thead><tr><th>Mes</th><th>Flujo</th><th>Uniforme</th><th>Adaptable</th><th>Intereses</th><th>Saldo</th></tr></thead><tbody><tr v-for="r in simulation.schedule" :key="r.month"><td>{{ r.month }}</td><td>{{ money(r.flow) }}</td><td>{{ money(r.payment) }}</td><td :class="{ 'risk-text-alto': r.flexible > r.capacity || r.flexible < r.interest }">{{ money(r.flexible) }}</td><td>{{ money(r.interest) }}</td><td>{{ money(r.balance) }}</td></tr></tbody></table></div><p class="modal-note">Los importes se muestran redondeados. El cálculo usa precisión completa; producción requiere reglas contractuales de redondeo.</p></template></UModal>
  </UApp>
</template>
