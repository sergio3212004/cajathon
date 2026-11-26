<script setup lang="ts">
import { computed } from 'vue'
import { histogram } from '../domain/escudo'
import { money } from '../domain/risk'
const props = defineProps<{ values: number[]; p10: number; p90: number; mean: number }>()
const bins = computed(() => histogram(props.values, 24))
const max = computed(() => Math.max(1, ...bins.value.map(b => b.count)))
const lo = computed(() => bins.value[0]?.lo ?? 0)
const hi = computed(() => bins.value.at(-1)?.hi ?? 1)
const x = (v: number) => 42 + (v - lo.value) / Math.max(1, hi.value - lo.value) * 488
</script>
<template>
  <div class="distribution">
    <svg viewBox="0 0 560 205" role="img" :aria-label="`Distribución de pérdida esperada condicional: media ${money(mean)}, P10 ${money(p10)}, P90 ${money(p90)}. No es pérdida realizada.`">
      <g v-for="n in [0, 1, 2, 3]" :key="n"><path :d="`M42 ${155 - n * 42}H540`" stroke="var(--line)" stroke-dasharray="3 5" /><text x="0" :y="159 - n * 42">{{ Math.round(max * n / 3) }}</text></g>
      <rect :x="x(p10)" y="17" :width="Math.max(0, x(p90) - x(p10))" height="138" fill="#ffc200" opacity=".09" />
      <rect v-for="(b, i) in bins" :key="i" :x="43 + i * 20.3" :y="155 - b.count / max * 123" width="15.5" :height="b.count / max * 123" :fill="b.lo >= mean ? '#c13d32' : '#e6a83a'" rx="2"><title>{{ money(b.lo) }}–{{ money(b.hi) }}: {{ b.count }} trayectorias</title></rect>
      <path :d="`M${x(mean)} 18V160`" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3" />
      <text :x="Math.min(450, x(mean) + 6)" y="15">Media</text>
      <text x="42" y="181">{{ money(lo) }}</text><text x="455" y="181">{{ money(hi) }}</text>
      <text x="42" y="201">Pérdida esperada condicional por trayectoria (S/)</text>
    </svg>
    <div class="distribution-quantiles"><span>P10 <b>{{ money(p10) }}</b></span><span>Media <b>{{ money(mean) }}</b></span><span>P90 <b>{{ money(p90) }}</b></span></div>
  </div>
</template>
