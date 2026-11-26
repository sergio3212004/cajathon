<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { transitionTask, type TaskEvent, type TaskStage } from '../domain/workflow'

const props = defineProps<{
  clientId: string
  fingerprint: string
  reviewed: boolean
  disabled: boolean
  history: TaskEvent[]
  advisor: string
}>()

const emit = defineEmits<{
  advance: [payload: { nextStage: TaskStage; evidence: string }]
}>()

const evidence = ref('')
const error = ref('')
const stage = computed<TaskStage>(() => props.history.at(-1)?.stage ?? 'Pendiente')

watch(() => `${props.fingerprint}/${props.clientId}`, () => {
  evidence.value = ''
  error.value = ''
})

function advance(next: TaskStage) {
  try {
    transitionTask(stage.value, next, {
      reviewed: props.reviewed,
      currentScenario: !props.disabled,
      evidence: evidence.value,
    })
    emit('advance', { nextStage: next, evidence: evidence.value.trim().slice(0, 500) })
    evidence.value = ''
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo actualizar el seguimiento.'
  }
}

const blocked = computed(() => props.disabled || !props.reviewed || evidence.value.trim().length < 8)
</script>

<template>
  <section class="followup-panel">
    <div class="section-title"><h2>Estado de intervención</h2><span class="risk-label neutral">{{ stage }}</span></div>
    <p>{{ clientId }} · Responsable: <b>{{ advisor }}</b> · Registro local en este navegador, sin envío de mensajes ni cambios crediticios.</p>
    <ol class="followup-stages">
      <li v-for="s in ['Pendiente', 'Aprobada', 'Comunicada', 'Ejecutada', 'Cerrada']" :key="s" :class="{ reached: s === stage || history.some(h => h.stage === s) }">{{ s }}</li>
    </ol>
    <p v-if="!reviewed" class="followup-warning">Registra primero la revisión humana de este cliente y escenario.</p>
    <template v-if="stage !== 'Cerrada'">
      <label>Observaciones del seguimiento<textarea v-model="evidence" rows="2" maxlength="500" placeholder="Resultado de la gestión. Mínimo 8 caracteres." aria-label="Evidencia del seguimiento"></textarea></label>
      <div class="followup-actions">
        <button v-if="stage === 'Pendiente'" class="button primary" :disabled="blocked" @click="advance('Aprobada')">Aprobar intervención</button>
        <template v-if="stage === 'Aprobada' || stage === 'Entrega fallida'">
          <button class="button primary" :disabled="blocked" @click="advance('Comunicada')">{{ stage === 'Entrega fallida' ? 'Registrar reintento entregado' : 'Registrar entrega confirmada' }}</button>
          <button v-if="stage === 'Aprobada'" class="text-button" :disabled="blocked" @click="advance('Entrega fallida')">Registrar entrega fallida</button>
        </template>
        <button v-if="stage === 'Comunicada'" class="button primary" :disabled="blocked" @click="advance('Ejecutada')">Registrar ejecución</button>
        <button v-if="stage === 'Ejecutada'" class="button primary" :disabled="blocked" @click="advance('Cerrada')">Cerrar caso</button>
      </div>
    </template>
    <p v-if="error" role="alert">{{ error }}</p>
    <details v-if="history.length" class="method-details">
      <summary>Historial de gestión ({{ history.length }})</summary>
      <p v-for="(event, i) in history" :key="i"><b>{{ event.stage }}</b> · {{ new Date(event.date).toLocaleString('es-PE') }} — {{ event.evidence }}</p>
    </details>
    <small>Prototipo local: las transiciones quedan guardadas en tu navegador para demostrar el flujo operativo completo.</small>
  </section>
</template>
