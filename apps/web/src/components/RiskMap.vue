<script setup lang="ts">
import { computed, ref } from 'vue'
import type { assess } from '../domain/risk'
const props = defineProps<{ items: ReturnType<typeof assess>[]; selected: string; heat: boolean }>()
const emit = defineEmits<{ select: [id: string] }>()
const zoom = ref(1)
const chosen = computed(() => props.items.find(b => b.id === props.selected))
const streets = Array.from({ length: 22 }, (_, i) => ({ x: 190 + i * 25, y: 80 + i * 18 }))
</script>

<template>
  <div class="risk-map">
    <div class="map-tools"><span><UIcon name="i-lucide-map-pin" /> Trujillo, La Libertad</span><span class="map-schematic">Cartografía esquemática</span></div>
    <div class="map-viewport" :style="{ transform: `scale(${zoom})` }">
      <svg viewBox="0 0 900 550" preserveAspectRatio="none" class="map-drawing" aria-hidden="true">
        <defs>
          <pattern id="farms" width="45" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)"><rect width="45" height="30" fill="#dce6d8"/><rect x="2" y="2" width="40" height="25" rx="2" fill="#e8eee1"/></pattern>
          <radialGradient id="hot"><stop stop-color="#e86a4a" stop-opacity=".5"/><stop offset=".55" stop-color="#ef9d55" stop-opacity=".25"/><stop offset="1" stop-color="#f3bc66" stop-opacity="0"/></radialGradient>
          <radialGradient id="warm"><stop stop-color="#f3bd59" stop-opacity=".45"/><stop offset="1" stop-color="#f3bd59" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="900" height="550" fill="#e9ede8"/>
        <path d="M500 0H900V550H770L690 440 740 335 635 245Z" fill="url(#farms)"/>
        <path d="M0 0H100L185 120 205 210 265 295 300 395 390 550H0Z" fill="#c8e3e9"/>
        <path d="M100 0L185 120 205 210 265 295 300 395 390 550" fill="none" stroke="#faf7ed" stroke-width="17"/>
        <path d="M210 70L400 25 600 110 665 240 710 350 670 480 445 510 330 385 280 245Z" fill="#e4e8e3"/>
        <g stroke="#fff" stroke-width="5" opacity=".86">
          <path v-for="(s, i) in streets" :key="`a${i}`" :d="`M${s.x} 60L${s.x + 190} 525`"/>
          <path v-for="(s, i) in streets" :key="`b${i}`" :d="`M190 ${s.y}L735 ${s.y - 95}`"/>
        </g>
        <g fill="#d5e3cf"><path d="M366 219L408 210 423 246 381 256Z"/><path d="M491 339L535 330 546 361 501 373Z"/><path d="M310 140L342 134 351 158 321 169Z"/></g>
        <g fill="none"><path d="M365 0L397 145 470 276 560 403 646 550" stroke="#d9cfb3" stroke-width="12"/><path d="M365 0L397 145 470 276 560 403 646 550" stroke="#fff9e6" stroke-width="8"/><path d="M200 340L465 280 900 150" stroke="#d8cbb2" stroke-width="12"/><path d="M200 340L465 280 900 150" stroke="#fff9e6" stroke-width="8"/></g>
        <path d="M900 300C810 280 790 362 710 360S635 407 554 410 475 458 411 470 366 486 346 510" stroke="#b8dce5" stroke-width="22" fill="none"/>
        <path d="M900 300C810 280 790 362 710 360S635 407 554 410 475 458 411 470 366 486 346 510" stroke="#a5d0db" stroke-width="2" fill="none"/>
        <g v-if="heat"><ellipse v-for="b in items" :key="b.id" :cx="b.x * 9" :cy="b.y * 5.5" :rx="b.score + 40" :ry="b.score + 30" :fill="b.level === 'Alto' ? 'url(#hot)' : 'url(#warm)'" /></g>
        <g class="map-labels"><text x="85" y="360" transform="rotate(-63 85 360)" class="ocean-label">Océano Pacífico</text><text x="200" y="167">Huanchaco</text><text x="330" y="111">La Esperanza</text><text x="537" y="177">El Porvenir</text><text x="700" y="120">Laredo</text><text x="430" y="370" class="city-label">Trujillo</text><text x="672" y="398" class="river-label">Río Moche</text><text x="490" y="490">Moche</text></g>
      </svg>
      <button v-for="b in items" :key="b.id" class="map-marker" :class="[b.level.toLowerCase(), { selected: selected === b.id }]" :style="{ left: `${b.x}%`, top: `${b.y}%` }" :aria-label="`${b.name}: riesgo ${b.level}, seleccionar negocio`" :aria-pressed="selected === b.id" @click="emit('select', b.id)"><span></span></button>
      <div v-if="chosen" class="map-callout" :style="{ left: `${Math.min(chosen.x, 65)}%`, top: `${chosen.y}%` }"><strong>{{ chosen.name }}</strong><span>{{ chosen.district }} <b :class="`risk-text-${chosen.level.toLowerCase()}`">Riesgo {{ chosen.level.toLowerCase() }}</b></span></div>
    </div>
    <div class="map-zoom"><UButton icon="i-lucide-plus" color="neutral" variant="ghost" aria-label="Acercar mapa" :disabled="zoom >= 1.4" @click="zoom = Math.min(1.4, zoom + .2)" /><UButton icon="i-lucide-minus" color="neutral" variant="ghost" aria-label="Alejar mapa" :disabled="zoom <= 1" @click="zoom = Math.max(1, zoom - .2)" /></div>
    <div class="map-legend"><span>Exposición a pérdidas</span><i class="bajo"></i> Baja <i class="medio"></i> Media <i class="alto"></i> Alta</div>
    <span class="map-north">N <UIcon name="i-lucide-navigation-2" /></span>
    <span class="map-scale">0 ━━━ 2 km aprox.</span>
  </div>
</template>
