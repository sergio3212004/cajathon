<script setup lang="ts">
import { ref } from 'vue'
import { segments, type Client } from '../domain/escudo'
import { parsePortfolioCsv, serializePortfolioCsv } from '../domain/portfolioIo'
import { origins, type Origin } from '../domain/supply'

const props = defineProps<{ clients: Client[]; customActive: boolean }>()
const emit = defineEmits<{
  importClients: [clients: Client[]]
  upsertClient: [client: Client]
  resetDefault: []
}>()

const importErrors = ref<string[]>([])
const importWarnings = ref<string[]>([])
const feedback = ref('')

const draft = ref({
  id: 'CE-NEW-01',
  name: 'Comercial Nueva Esperanza',
  district: 'Trujillo',
  region: 'La Libertad',
  sector: 'Comercio',
  segment: segments[0] as string,
  lat: -8.111,
  lng: -79.028,
  exposure: 0.72,
  vulnerability: 0.55,
  income: 11500,
  expenses: 6200,
  assets: 38000,
  balance: 21000,
  payment: 1650,
  otherDebt: 320,
  cash: 1400,
  arrears: 0,
  incidents: 3,
  observations: 24,
  cost: 850,
  supplyOrigin: 'Piura' as Origin,
})

function downloadTemplate() {
  const csv = serializePortfolioCsv(props.clients.slice(0, 5))
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'cajaescudo-cartera-plantilla.csv'
  a.click()
  URL.revokeObjectURL(url)
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importErrors.value = []
  importWarnings.value = []
  feedback.value = ''
  const text = await file.text()
  const parsed = parsePortfolioCsv(text)
  importErrors.value = parsed.errors
  importWarnings.value = parsed.warnings
  if (parsed.clients.length && !parsed.errors.length) {
    emit('importClients', parsed.clients)
    feedback.value = `Se cargaron ${parsed.clients.length} clientes desde ${file.name}.`
  }
  input.value = ''
}

function addClient() {
  importErrors.value = []
  if (!draft.value.id.trim() || !draft.value.name.trim()) {
    importErrors.value = ['Código y nombre del negocio son obligatorios.']
    return
  }
  emit('upsertClient', {
    ...draft.value,
    id: draft.value.id.trim(),
    name: draft.value.name.trim(),
    district: draft.value.district.trim() || 'Trujillo',
    region: draft.value.region.trim() || 'La Libertad',
  })
  feedback.value = `Cliente ${draft.value.id.trim()} agregado/actualizado en la cartera activa.`
}
</script>

<template>
  <section class="segment-panel portfolio-manager">
    <div class="section-title">
      <h2>Gestión de cartera</h2>
      <span class="risk-label" :class="customActive ? 'moderate' : 'neutral'">
        {{ customActive ? `Cartera cargada (${clients.length})` : `Cartera base (${clients.length})` }}
      </span>
    </div>
    <p class="manager-intro">
      Carga una cartera de prueba en formato CSV o agrega clientes individuales para demostrar el flujo de evaluación.
      Los datos se conservan localmente en este navegador durante la demostración.
    </p>

    <div class="manager-actions">
      <label class="button secondary file-button">
        <UIcon name="i-lucide-upload" /> Importar cartera CSV
        <input type="file" accept=".csv,text/csv" class="sr-only" @change="onFileChange">
      </label>
      <button class="button secondary" type="button" @click="downloadTemplate">
        <UIcon name="i-lucide-file-spreadsheet" /> Descargar plantilla CSV
      </button>
      <button v-if="customActive" class="text-button" type="button" @click="emit('resetDefault'); feedback = 'Cartera restablecida al fixture base de 60 clientes.'">
        Restablecer 60 sintéticos
      </button>
    </div>

    <div v-if="feedback" class="notice" role="status">{{ feedback }}</div>
    <div v-if="importErrors.length" class="notice error-notice" role="alert">
      <div>
        <strong>No se pudo importar el archivo:</strong>
        <ul><li v-for="e in importErrors.slice(0, 6)" :key="e">{{ e }}</li></ul>
      </div>
    </div>
    <div v-if="importWarnings.length" class="notice warning-notice" role="status">
      <div>
        <strong>Advertencias:</strong>
        <ul><li v-for="w in importWarnings.slice(0, 4)" :key="w">{{ w }}</li></ul>
      </div>
    </div>

    <details class="method-details">
      <summary>Agregar o actualizar un cliente manualmente</summary>
      <form class="client-form-grid" @submit.prevent="addClient">
        <label>Código <input v-model="draft.id" type="text" required></label>
        <label>Negocio <input v-model="draft.name" type="text" required></label>
        <label>Distrito <input v-model="draft.district" type="text" required></label>
        <label>Región <input v-model="draft.region" type="text" required></label>
        <label>Sector
          <select v-model="draft.sector">
            <option>Comercio</option><option>Agricultura</option><option>Manufactura</option><option>Servicios</option>
          </select>
        </label>
        <label>Segmento
          <select v-model="draft.segment">
            <option v-for="s in segments" :key="s">{{ s }}</option>
          </select>
        </label>
        <label>Origen suministro
          <select v-model="draft.supplyOrigin">
            <option v-for="o in origins" :key="o">{{ o }}</option>
          </select>
        </label>
        <label>Saldo (S/) <input v-model.number="draft.balance" type="number" min="100" step="100"></label>
        <label>Ingreso mensual (S/) <input v-model.number="draft.income" type="number" min="100" step="100"></label>
        <label>Gasto mensual (S/) <input v-model.number="draft.expenses" type="number" min="100" step="100"></label>
        <label>Activos (S/) <input v-model.number="draft.assets" type="number" min="100" step="100"></label>
        <label>Cuota mensual (S/) <input v-model.number="draft.payment" type="number" min="50" step="50"></label>
        <label>Costo preventivo (S/) <input v-model.number="draft.cost" type="number" min="50" step="50"></label>
        <label>Latitud <input v-model.number="draft.lat" type="number" step="0.0001"></label>
        <label>Longitud <input v-model.number="draft.lng" type="number" step="0.0001"></label>
        <div class="form-submit-cell">
          <button class="button primary" type="submit"><UIcon name="i-lucide-plus" /> Guardar cliente</button>
        </div>
      </form>
    </details>
  </section>
</template>
