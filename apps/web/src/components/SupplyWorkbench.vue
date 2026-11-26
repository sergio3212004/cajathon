<script setup lang="ts">
import { computed } from 'vue'
import type { Analysis, ClimateScenario, ClientResult } from '../domain/escudo'
import { chainForClient, origins, simulateInventory, supplyChains, supplyPresets } from '../domain/supply'
import { money } from '../domain/risk'

const props = defineProps<{ analysis: Analysis; scenario: ClimateScenario; selected?: ClientResult; pending: boolean }>()
const emit = defineEmits<{ scenario: [value: ClimateScenario]; select: [id: string]; review: [] }>()
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const networkRows = computed(() => props.analysis.before.clients.filter(r => chainForClient(r.client).origin === props.analysis.scenario.supply.origin).sort((a, b) => b.indirectLoss - a.indirectLoss))
const focus = computed(() => networkRows.value.find(r => r.client.id === props.selected?.client.id) ?? networkRows.value[0])
const chain = computed(() => supplyChains.find(c => c.origin === props.scenario.supply.origin)!)
const maxOutage = computed(() => props.scenario.impactMode === 'direct' || !props.scenario.supply.enabled
  ? 0 : Math.min(30, props.scenario.supply.outageDays * props.scenario.intensity / 100))
const timeline = computed(() => simulateInventory({
  outageDays: props.scenario.impactMode === 'direct' || !props.scenario.supply.enabled ? 0 : maxOutage.value,
  inventoryDays: props.scenario.supply.inventoryDays,
  substitution: props.scenario.supply.substitution / 100, dependency: chain.value.dependency,
}))
const indirectOnlyCount = computed(() => props.analysis.before.clients.filter(r => r.damage < .01 && r.indirectLoss > .01).length)
const savedScenario = computed(() => supplyPresets.find(p => p.id !== 'missing'
  && p.intensity === props.scenario.intensity && p.impactMode === props.scenario.impactMode
  && JSON.stringify(p.supply) === JSON.stringify(props.scenario.supply))?.id ?? 'custom')
function updateSupply(key: string, value: unknown) {
  emit('scenario', { ...props.scenario, supply: { ...props.scenario.supply, [key]: value } })
}
function preset(id: string) {
  const p = supplyPresets.find(p => p.id === id)
  if (!p) return
  emit('scenario', { ...props.scenario, hazard: 'Inundación', intensity: p.intensity,
    impactMode: p.impactMode, supply: { ...p.supply } })
}
</script>

<template>
  <div class="supply-workspace">
    <div class="supply-toolbar">
      <h2>Dependencias de abastecimiento</h2>
      <label>Escenario guardado<select :value="savedScenario" aria-label="Escenario de abastecimiento" @change="preset(($event.target as HTMLSelectElement).value)"><option value="custom" disabled>Personalizado</option><option v-for="p in supplyPresets.filter(p => p.id !== 'missing')" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
    </div>

    <section class="supply-controls" aria-label="Parámetros de suministros">
      <label class="supply-toggle"><input :checked="scenario.supply.enabled" type="checkbox" @change="updateSupply('enabled', ($event.target as HTMLInputElement).checked)"> Incluir suministros</label>
      <label>Región de origen<select :value="scenario.supply.origin" @change="updateSupply('origin', ($event.target as HTMLSelectElement).value)"><option v-for="origin in origins" :key="origin">{{ origin }}</option></select></label>
      <label>Interrupción nominal <b>{{ scenario.supply.outageDays }} días</b><input :value="scenario.supply.outageDays" type="range" min="0" max="30" aria-label="Días de interrupción de suministro" @input="updateSupply('outageDays', +($event.target as HTMLInputElement).value)"></label>
      <label>Reserva inicial <b>{{ scenario.supply.inventoryDays }} días</b><input :value="scenario.supply.inventoryDays" type="range" min="0" max="30" aria-label="Días de inventario" @input="updateSupply('inventoryDays', +($event.target as HTMLInputElement).value)"></label>
      <label>Abastecimiento alternativo <b>{{ scenario.supply.substitution }}%</b><input :value="scenario.supply.substitution" type="range" min="0" max="100" step="5" aria-label="Porcentaje de sustitución" @input="updateSupply('substitution', +($event.target as HTMLInputElement).value)"></label>
    </section>
    <div v-if="pending" class="notice warning-notice" role="status">Resultados anteriores. La revisión y la exportación requieren un análisis actualizado.</div>

    <section class="chain-board" aria-label="Cadena interregional hipotética">
      <div class="section-title"><h2>{{ chain.product }}</h2><span>Red sintética</span></div>
      <div class="chain-track">
        <article class="chain-node source"><UIcon name="i-lucide-cloud-rain" /><span>Origen</span><h3>{{ chain.origin }}</h3><p>{{ chain.producer }}</p><b>{{ maxOutage.toFixed(1) }} días de interrupción</b></article>
        <span class="chain-connector" aria-hidden="true">→</span>
        <article class="chain-node"><UIcon name="i-lucide-truck" /><span>Transporte</span><h3>{{ chain.corridor }}</h3><b>{{ pct(chain.dependency) }} de dependencia</b></article>
        <span class="chain-connector" aria-hidden="true">→</span>
        <article class="chain-node"><UIcon name="i-lucide-warehouse" /><span>Distribución</span><h3>{{ chain.hub }}</h3><p>{{ chain.alternative }}</p><b>{{ scenario.supply.substitution }}% sustituible</b></article>
        <span class="chain-connector" aria-hidden="true">→</span>
        <article class="chain-node destination"><UIcon name="i-lucide-store" /><span>Cliente</span><h3>{{ focus?.client.name ?? 'Sin clientes' }}</h3><p>{{ focus ? `${focus.client.district}, ${focus.client.region}` : 'Revisa los filtros de cartera' }}</p><b>{{ focus ? money(focus.indirectLoss) : '—' }} de impacto indirecto</b></article>
      </div>
    </section>

    <div class="supply-evidence-grid">
      <section class="chart-panel inventory-panel"><div class="section-title"><h2>Cobertura de inventario</h2><span>Escenario central · 30 días</span></div>
        <div class="inventory-bars" role="img" aria-label="Inventario normalizado al cierre de cada uno de los próximos 30 días">
          <div v-for="d in timeline" :key="d.day" :class="{ shortage: d.unmet > 0 }" :title="`Día ${d.day}: inventario ${d.closing.toFixed(2)}, demanda no atendida ${d.unmet.toFixed(2)}`"><i :style="{ height: `${Math.max(2, d.closing / Math.max(1, scenario.supply.inventoryDays) * 100)}%` }"></i><span v-if="d.day === 1 || d.day % 5 === 0">{{ d.day }}</span></div>
        </div>
        <div class="inventory-key"><span><i></i> Reserva al cierre</span><span><i class="shortage-key"></i> Día con demanda no atendida</span></div>
        <p>{{ timeline.filter(d => d.unmet > 0).length }} días con faltantes · {{ timeline.reduce((s, d) => s + d.unmet, 0).toFixed(1) }} unidades de demanda perdidas.</p>
        <details class="method-details"><summary>Balance diario y supuestos</summary><p>Demanda de una unidad diaria; severidad central 1.0. Trayectoria condicional, no promedio Monte Carlo ni inventario observado. Proveedores y rutas no verificados.</p><div class="table-overflow"><table><thead><tr><th>Día</th><th>Inicio</th><th>Entrega</th><th>Atendido</th><th>Faltante</th><th>Cierre</th></tr></thead><tbody><tr v-for="d in timeline" :key="d.day"><th>{{ d.day }}</th><td>{{ d.opening.toFixed(2) }}</td><td>{{ d.delivered.toFixed(2) }}</td><td>{{ d.served.toFixed(2) }}</td><td>{{ d.unmet.toFixed(2) }}</td><td>{{ d.closing.toFixed(2) }}</td></tr></tbody></table></div></details>
      </section>
      <section class="chart-panel"><div class="section-title"><h2>Impacto indirecto</h2><span>Cartera seleccionada</span></div>
        <div class="supply-impact-number"><strong>{{ indirectOnlyCount }}</strong><span>clientes con impacto indirecto y sin daño físico</span></div>
        <dl class="supply-totals"><div><dt>Daño físico</dt><dd>{{ money(analysis.before.damage) }}</dd></div><div><dt>Pérdida operativa indirecta</dt><dd>{{ money(analysis.before.indirectLoss) }}</dd></div><div><dt>Impacto económico total</dt><dd>{{ money(analysis.before.economicImpact) }}</dd></div><div><dt>Con intervención estimada</dt><dd class="positive-text">{{ money(analysis.after.economicImpact) }}</dd></div></dl>
        <div class="table-overflow"><table><caption>Pérdida crediticia media por canal, con la misma semilla</caption><thead><tr><th>Directo aislado</th><th>Indirecto aislado</th><th>Escenario activo</th></tr></thead><tbody><tr><td>{{ money(analysis.directOnly.expectedLoss) }}</td><td>{{ analysis.indirectOnly ? money(analysis.indirectOnly.expectedLoss) : 'No disponible: datos de red no vigentes' }}</td><td>{{ money(analysis.before.expectedLoss) }}</td></tr></tbody></table></div>
        <details class="method-details"><summary>Criterios de cálculo</summary><p>El impacto económico incluye daño físico, pérdida de margen y sobrecostos; no se suma la pérdida crediticia. Los canales crediticios incluyen el mismo riesgo base y no son aditivos. Los efectos preventivos son hipotéticos.</p></details>
      </section>
    </div>
    <section class="segment-panel network-clients"><div class="section-title"><h2>Clientes dependientes</h2><span>{{ networkRows.length }} clientes · {{ analysis.scenario.supply.origin }}</span></div>
      <div class="table-overflow"><table><caption class="sr-only">Clientes dependientes del origen seleccionado</caption><thead><tr><th>Negocio</th><th>Región</th><th>Daño físico</th><th>Impacto indirecto</th><th>Faltante equivalente</th><th>Flujo insuficiente</th><th>Revisión</th></tr></thead><tbody><tr v-for="r in networkRows" :key="r.client.id"><th><button class="table-link" :aria-pressed="focus?.client.id === r.client.id" @click="emit('select', r.client.id)">{{ r.client.name }}<small>{{ r.client.id }}</small></button></th><td>{{ r.client.region }}</td><td>{{ money(r.damage) }}</td><td>{{ money(r.indirectLoss) }}</td><td>{{ r.unmetDays.toFixed(1) }} días</td><td>{{ pct(r.shortfall) }}</td><td><button class="text-button" :disabled="pending" @click="emit('select', r.client.id); emit('review')">Revisar caso</button></td></tr></tbody></table></div>
      <p v-if="!networkRows.length" class="list-empty">No hay clientes de esta cadena en los filtros actuales.</p>
    </section>
  </div>
</template>
