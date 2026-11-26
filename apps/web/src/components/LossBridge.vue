<script setup lang="ts">
import { computed } from 'vue'
import { money } from '../domain/risk'
const props = defineProps<{ base: number; stress: number; after: number }>()
const max = computed(() => Math.max(props.stress * 1.15, 1))
const bars = computed(() => [
  { name: 'Base', value: props.base, bottom: 0, color: '#6e8d9b' },
  { name: 'Impacto climático', value: Math.max(0, props.stress - props.base), bottom: props.base, color: '#c13d32' },
  { name: 'Estrés', value: props.stress, bottom: 0, color: '#9d2929' },
  { name: 'Prevención', value: Math.max(0, props.stress - props.after), bottom: props.after, color: '#327968' },
  { name: 'Residual', value: props.after, bottom: 0, color: '#327968' },
])
</script>
<template>
  <svg class="loss-bridge" viewBox="0 0 620 235" role="img" :aria-label="`Pérdida base ${money(base)}, bajo estrés ${money(stress)}, residual ${money(after)}. Efecto preventivo supuesto.`">
    <path d="M20 178H610M20 115H610M20 52H610" stroke="var(--line)" stroke-dasharray="3 5" />
    <g v-for="(bar, i) in bars" :key="bar.name">
      <rect :x="25 + i * 122" :y="178 - (bar.value + bar.bottom) / max * 145" width="78" :height="Math.max(1, bar.value / max * 145)" :fill="bar.color" rx="3" />
      <text :x="64 + i * 122" :y="168 - (bar.value + bar.bottom) / max * 145" text-anchor="middle">{{ i === 3 ? '−' : i === 1 ? '+' : '' }}{{ money(bar.value) }}</text>
      <text :x="64 + i * 122" y="203" text-anchor="middle">{{ bar.name }}</text>
    </g>
    <text x="20" y="230">Sensibilidad de pérdida crediticia · horizonte de capacidad de pago: 30 días</text>
  </svg>
</template>
