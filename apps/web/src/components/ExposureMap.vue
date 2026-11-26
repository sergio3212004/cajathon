<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ClientResult } from '../domain/escudo'

const props = defineProps<{ items: ClientResult[]; selected: string; layer: 'damage' | 'payment'; heat: boolean }>()
const emit = defineEmits<{ select: [id: string] }>()
const element = ref<HTMLDivElement>()
const offline = ref(false)
let map: L.Map | undefined
let markers: L.LayerGroup | undefined
let canvas: HTMLCanvasElement | undefined
let observer: ResizeObserver | undefined
let tileErrors = 0
function draw() {
  if (!map || !canvas) return
  const size = map.getSize()
  const origin = map.containerPointToLayerPoint([0, 0])
  L.DomUtil.setPosition(canvas, origin)
  canvas.width = size.x; canvas.height = size.y
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, size.x, size.y)
  if (!props.heat) return
  // Gaussian kernel interpolation in screen pixels, not a calibrated geographic raster.
  const points = props.items.map(r => ({
    point: map!.latLngToContainerPoint([r.client.lat, r.client.lng]),
    weight: props.layer === 'payment' ? r.shortfall : r.damage / Math.max(1, r.client.assets),
  }))
  const step = 9, bandwidth = 44
  for (let y = 0; y < size.y; y += step) for (let x = 0; x < size.x; x += step) {
    let numerator = 0, denominator = 0
    for (const { point, weight } of points) {
      const d = (x - point.x) ** 2 + (y - point.y) ** 2
      if (d > bandwidth ** 2 * 10) continue
      const k = Math.exp(-d / (2 * bandwidth ** 2))
      numerator += k * weight; denominator += k
    }
    if (denominator < .08) continue
    const value = numerator / denominator
    const normalized = Math.min(1, value / (props.layer === 'payment' ? .5 : .15))
    // Fixed scale, independent of filters, so comparable across runs.
    const hue = 56 - normalized * 56
    ctx.fillStyle = `hsla(${hue}, 97%, ${56 - normalized * 9}%, ${Math.min(.72, denominator * .25)})`
    ctx.fillRect(x, y, step + .5, step + .5)
  }
}
function renderMarkers() {
  if (!map || !markers) return
  markers.clearLayers()
  props.items.forEach(r => {
    const color = r.level === 'Alta' ? '#fb775e' : r.level === 'Moderada' ? '#ffce5b' : '#b6d1c9'
    const marker = L.circleMarker([r.client.lat, r.client.lng], {
      radius: props.selected === r.client.id ? 9 : 4.5, color: props.selected === r.client.id ? '#fff' : '#102d39',
      weight: props.selected === r.client.id ? 3 : 1.5, fillColor: color, fillOpacity: 1,
    })
    const label = document.createElement('span')
    label.textContent = `${r.client.name} · Prioridad ${r.level.toLowerCase()}`
    marker.bindTooltip(label, { direction: 'top' })
    marker.on('click', () => emit('select', r.client.id))
    markers!.addLayer(marker)
  })
  draw()
}
onMounted(() => {
  if (!element.value) return
  map = L.map(element.value, { zoomControl: false, attributionControl: true, scrollWheelZoom: false, minZoom: 10, maxZoom: 16 }).setView([-8.091, -79.035], 12)
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)
  tiles.on('tileerror', () => { tileErrors++; if (tileErrors > 2) offline.value = true })
  tiles.on('tileload', () => { offline.value = false; tileErrors = 0 })
  L.control.zoom({ position: 'bottomleft' }).addTo(map)
  canvas = L.DomUtil.create('canvas', 'heat-canvas') as HTMLCanvasElement
  canvas.setAttribute('aria-hidden', 'true')
  map.getPanes().overlayPane.appendChild(canvas)
  markers = L.layerGroup().addTo(map)
  map.on('moveend zoomend resize', draw)
  observer = new ResizeObserver(() => { map?.invalidateSize(); draw() })
  observer.observe(element.value)
  renderMarkers()
})
watch(() => [props.items, props.selected, props.layer, props.heat], renderMarkers)
onBeforeUnmount(() => { observer?.disconnect(); map?.remove() })
</script>

<template>
  <div class="territory-map">
    <div ref="element" class="leaflet-host" role="region" aria-label="Mapa de negocios sintéticos cerca de Trujillo. Selecciona también desde la lista accesible de clientes."></div>
    <div class="territory-stamp"><span class="signal-dot"></span> Trujillo y alrededores <small>Ubicaciones sintéticas</small></div>
    <div v-if="offline" class="map-offline" role="status">Mapa base no disponible. Los puntos conservan coordenadas; usa la lista de clientes.</div>
    <div class="map-heat-key"><strong>{{ layer === 'damage' ? 'Daño relativo del negocio' : 'Probabilidad de flujo insuficiente' }}</strong><div class="heat-ramp"></div><span>0% <i>Interpolación visual</i> {{ layer === 'damage' ? '≥15%' : '≥50%' }}</span></div>
    <div class="map-caption">Capa sintética · no es un mapa oficial de amenaza</div>
  </div>
</template>
