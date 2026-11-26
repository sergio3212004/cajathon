<script setup lang="ts">
const sources = [
  { name: 'SENAMHI / PHISIS', role: 'Avisos, observaciones y caudales nacionales', access: 'Consulta y CSV según producto; REST estable no asumida', url: 'https://www.senamhi.gob.pe/servicios/main.php?p=monitoreo-informacion-diaria' },
  { name: 'CENEPRED / SIGRID', role: 'Geometrías de amenaza y susceptibilidad', access: 'Catálogo geográfico; revisar capa, escala, licencia y vigencia', url: 'https://www.geoidep.gob.pe/cenepred' },
  { name: 'Open-Meteo / GloFAS', role: 'Pronósticos y caudal; no profundidad predial', access: 'JSON y descargas; revisar licencia comercial y dependencias entre fuentes', url: 'https://open-meteo.com/en/docs/flood-api' },
  { name: 'MTC / Provías', role: 'Geometrías logísticas y restricciones viales', access: 'Geoservicios y reportes; no asumir cierres en vivo', url: 'https://www.gob.pe/74825-geoportal-del-mtc' },
  { name: 'MIDAGRI / SISAP', role: 'Precios, volúmenes y procedencias en mercados cubiertos', access: 'Portal y reportes; API pública estable no confirmada', url: 'https://www.gob.pe/institucion/midagri/informes-publicaciones/1211-boletin-de-precios-diarios-de-alimentos' },
  { name: 'INEI', role: 'Relaciones agregadas entre sectores', access: 'Matrices de referencia; revisar antigüedad, no inferir proveedores individuales', url: 'https://www.inei.gob.pe/estadisticas/indice-tematico/matriz-insumo-producto-13673' },
]
</script>
<template>
  <section class="segment-panel evidence-catalog">
    <div class="section-title"><h2>Catálogo de fuentes</h2><span class="risk-label neutral">Pendiente de integración</span></div>
    <p>Referencias externas no conectadas. La cartera, los proveedores y los eventos actuales son sintéticos.</p>
    <div class="table-overflow"><table><thead><tr><th>Fuente de referencia</th><th>Uso previsto</th><th>Acceso y límite</th><th>Estado</th></tr></thead><tbody><tr v-for="source in sources" :key="source.name"><th><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.name }}</a></th><td>{{ source.role }}</td><td>{{ source.access }}</td><td><span class="risk-label neutral">No integrada</span></td></tr></tbody></table></div>
    <details class="method-details"><summary>Procedencia de esta simulación</summary><p>Cartera: fixture CE-2.0 (60 negocios). Red: fixture RED-1.0 (tres cadenas). Semilla y parámetros incluidos en el CSV; no hay fecha de emisión oficial ni exactitud predictiva medida.</p><p>Los modos de datos completos, insuficientes o vencidos son condiciones de prueba, no el estado real de una API. La frecuencia upstream de 65% mensual, el 45% de gastos sensibles a compras y la prima de sustitución de 25% son supuestos.</p></details>
  </section>
</template>
