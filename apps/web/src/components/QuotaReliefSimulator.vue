<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ClientResult } from '../domain/escudo'
import { money, simulate, type Business } from '../domain/risk'

const props = defineProps<{ clientResult: ClientResult }>()

const tea = ref(26)
const months = ref(12)
const shock = ref(Math.min(80, Math.max(5, Math.round(props.clientResult.revenueDrop * 100 / 5) * 5)))

watch(() => props.clientResult.client.id, () => {
  shock.value = Math.min(80, Math.max(5, Math.round(props.clientResult.revenueDrop * 100 / 5) * 5))
})

const businessProxy = computed<Business>(() => ({
  id: props.clientResult.client.id,
  name: props.clientResult.client.name,
  owner: props.clientResult.client.name,
  sector: props.clientResult.client.sector,
  district: props.clientResult.client.district,
  x: 50,
  y: 50,
  exposure: props.clientResult.client.exposure,
  income: props.clientResult.client.income,
  expenses: props.clientResult.client.expenses,
  principal: props.clientResult.client.balance,
  assets: [],
}))

const simulation = computed(() =>
  simulate(
    businessProxy.value,
    props.clientResult.damage + props.clientResult.indirectLoss,
    tea.value,
    months.value,
    shock.value,
  ),
)

const chartMax = computed(() =>
  Math.max(...simulation.value.schedule.map(r => Math.max(r.flow, r.payment, r.flexible)), 1),
)
</script>

<template>
  <section class="quota-relief-panel" aria-label="Simulador de alivio de cuotas">
    <div class="section-title">
      <h3>Simulador de cuota adaptable</h3>
      <span class="risk-label" :class="simulation.feasible ? 'low' : 'high'">
        {{ simulation.feasible ? 'Pasa filtro de capacidad (≤70%)' : 'Supera capacidad o no cubre interés' }}
      </span>
    </div>
    <p class="quota-note">
      Evalúa una reprogramación que reduce la cuota en los meses de caída de ingresos manteniendo capital y TEA.
      Solo orientativo: requiere evaluación crediticia y consentimiento.
    </p>

    <div class="quota-controls">
      <label>TEA <b>{{ tea }}%</b><input v-model.number="tea" type="range" min="0" max="60" step="1"></label>
      <label>Plazo
        <select v-model.number="months">
          <option :value="6">6 meses</option>
          <option :value="12">12 meses</option>
          <option :value="18">18 meses</option>
        </select>
      </label>
      <label>Caída inicial <b>{{ shock }}%</b><input v-model.number="shock" type="range" min="0" max="80" step="5"></label>
    </div>

    <div class="quota-kpis">
      <div><span>Cuota uniforme</span><strong>{{ money(simulation.payment) }}</strong></div>
      <div><span>1.ª cuota adaptable</span><strong class="positive-text">{{ money(simulation.schedule[0]!.flexible) }}</strong></div>
      <div><span>Costo extra del ajuste</span><strong>{{ money(simulation.flexibleTotal - simulation.fixedTotal) }}</strong></div>
    </div>

    <div class="quota-bars" role="img" aria-label="Comparación mensual de flujo disponible y cuota adaptable">
      <div v-for="row in simulation.schedule" :key="row.month" class="quota-col" :title="`Mes ${row.month}: flujo ${money(row.flow)}, adaptable ${money(row.flexible)}, uniforme ${money(row.payment)}`">
        <div class="quota-bar-pair">
          <i class="flow" :style="{ height: `${row.flow / chartMax * 100}%` }"></i>
          <i class="flex" :class="{ warn: row.flexible > row.capacity || row.flexible < row.interest }" :style="{ height: `${row.flexible / chartMax * 100}%` }"></i>
        </div>
        <span>M{{ row.month }}</span>
      </div>
    </div>

    <details class="method-details">
      <summary>Ver cronograma mensual ({{ months }} meses)</summary>
      <div class="table-overflow">
        <table>
          <thead><tr><th>Mes</th><th>Flujo</th><th>Uniforme</th><th>Adaptable</th><th>Interés</th><th>Saldo</th></tr></thead>
          <tbody>
            <tr v-for="r in simulation.schedule" :key="r.month">
              <td>{{ r.month }}</td>
              <td>{{ money(r.flow) }}</td>
              <td>{{ money(r.payment) }}</td>
              <td :class="{ 'danger-text': r.flexible > r.capacity || r.flexible < r.interest }">{{ money(r.flexible) }}</td>
              <td>{{ money(r.interest) }}</td>
              <td>{{ money(r.balance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>
