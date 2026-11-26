# CajaEscudo · Fuentes e integraciones propuestas

Registro: **2026-11-26**. Estado: **catálogo para implementación futura**.
La conversación revisó documentación pública. No se han autenticado ni probado
los conectores en la aplicación, ni se garantiza acceso, disponibilidad o SLA.

## 1. Política de selección

Priorizar entidad oficial, metodología publicada, cobertura pertinente,
granularidad, actualización, licencia y acceso reproducible.
Una descarga oficial puede ser más apropiada que una API sin procedencia.
No confundir un visor con una API estable, ni WMS con datos analizables.

| Fuente | Insumo y uso | Acceso documentado | Restricciones y siguiente verificación |
|---|---|---|---|
| SENAMHI/PHISIS | Avisos, niveles y caudales; contexto nacional | Consultas web y CSV en monitoreo diario | No dar por existente una REST pública para todos los productos; comprobar exportación, condiciones y vigencia |
| SENAMHI/PISCO | Históricos y anomalías | Productos descargables; formato/resolución dependen de versión | Confirmar versión, periodo y licencia en origen; no confundir histórico interpolado con pronóstico |
| Open-Meteo Weather/Ensemble | Lluvia/temperatura y miembros del conjunto | JSON HTTP; `/v1/forecast`, `/v1/ensemble` en hosts documentados | Gratuito sujeto a condiciones no comerciales y cuotas; revisar plan comercial; validar habilidad local |
| Open-Meteo Flood | Caudal diario GloFAS | `https://flood-api.open-meteo.com/v1/flood` | Grilla aproximada de 5 km: comprobar río/celda; no profundidad local; no independiente de GloFAS |
| Copernicus GloFAS/EWDS | Históricos, forecasts y reforecasts | `cdsapi`, cuenta/token, aceptación manual de términos | EWDS no es servicio de tiempo crítico; solicitar canal operativo a soporte si corresponde |
| Google Flood Forecasting | Caudales/estado de inundación y productos disponibles | `floodforecasting.googleapis.com`; aprobación y clave | Lista de espera; cobertura y calidad por punto; no dependencia crítica de demo |
| CENEPRED/SIGRID | Amenazas, susceptibilidad y exposición | ArcGIS REST y descargas según capa; catálogo GEOIDEP | Descubrir capas y verificar licencia, escala, vigencia y consultas soportadas |
| MTC/Provías | Carreteras y nodos logísticos | Geoservicios WMS/WFS, archivos y catálogos | Versiones/fechas diferentes; comprobar geometrías y conectividad |
| MTC emergencias | Restricción/interrupción por ruta y tramo | Dataset CSV y reportes XLSX/PDF | Dataset revisado declara frecuencia semanal y corte temporal; no llamarlo API en vivo |
| MIDAGRI/SISAP | Precios, volúmenes y procedencias en mercados cubiertos | Portal oficial y reportes | No API pública estable confirmada; no cobertura de cada proveedor del país |
| MIDAGRI/SIEA | Producción y estacionalidad agrícola | Publicaciones/datasets según producto | Confirmar serie, periodicidad y formato antes de usar |
| INEI | Matriz insumo-producto y clasificación sectorial | Tablas descargables/consulta | Página revisada con referencia 2007; no inferir flujos regionales actuales ni proveedores individuales |
| Caja/cliente/asesor | Pagos, deuda, recuperaciones, inventario y proveedores | Integración o carga autorizada por definir | No fuente pública; consentimiento/base legal y controles institucionales |

## 2. Enlaces de origen

- [SENAMHI monitoreo diario](https://www.senamhi.gob.pe/servicios/main.php?p=monitoreo-informacion-diaria).
- [SENAMHI estaciones](https://www.senamhi.gob.pe/servicios?p=estaciones).
- [SENAMHI indicadores de sequía/PISCO](https://www.senamhi.gob.pe/?p=sequias).
- [Open-Meteo Weather](https://open-meteo.com/en/docs).
- [Open-Meteo Ensemble](https://open-meteo.com/en/docs/ensemble-api).
- [Open-Meteo Flood](https://open-meteo.com/en/docs/flood-api).
- [Open-Meteo precios](https://open-meteo.com/en/pricing) y [condiciones](https://open-meteo.com/en/terms).
- [Pronósticos de corridas anteriores](https://open-meteo.com/en/docs/previous-runs-api).
- [GloFAS forecast](https://ewds.climate.copernicus.eu/datasets/cems-glofas-forecast?tab=overview).
- [EWDS API](https://ewds.climate.copernicus.eu/how-to-api).
- [Restricciones operativas EWDS](https://confluence.ecmwf.int/display/CEMS/EWDS).
- [Google Flood API y acceso](https://developers.google.com/flood-forecasting).
- [Google Flood API REST](https://developers.google.com/flood-forecasting/rest).
- [CENEPRED en GEOIDEP](https://www.geoidep.gob.pe/cenepred).
- [Catálogo GEOIDEP](https://www.geoidep.gob.pe/).
- [Geoportal MTC](https://www.gob.pe/74825-geoportal-del-mtc).
- [Dataset emergencias MTC](https://www.datosabiertos.gob.pe/dataset/emergencias-en-la-red-vial-nacional-ministerio-de-transportes-y-comunicaciones-%E2%80%93-mtc).
- [Reportes de emergencias MTC](https://www.gob.pe/institucion/mtc/colecciones/673-reportes-de-emergencias-y-alertas-en-las-vias-nacionales).
- [SISAP](http://sistemas.midagri.gob.pe/sisap/portal).
- [Boletines MIDAGRI](https://www.gob.pe/institucion/midagri/informes-publicaciones/1211-boletin-de-precios-diarios-de-alimentos).
- [Matriz insumo-producto INEI](https://www.inei.gob.pe/estadisticas/indice-tematico/matriz-insumo-producto-13673).
- [Curvas de daño JRC](https://publications.jrc.ec.europa.eu/repository/handle/JRC105688).
- [CLIMADA](https://climada.ethz.ch/features).

## 3. Orden de integración recomendado

1. Una fuente meteorológica JSON documentada y un archivo oficial SENAMHI.
2. Una capa oficial de amenaza y geometrías logísticas adecuadas.
3. Un corte MTC de emergencias y una serie de precios/abastecimiento.
4. Datos declarados o sintéticos de una cadena interregional.
5. GloFAS histórico/reforecast para evaluación, descargado con anticipación.
6. Google Flood API solo cuando se apruebe y pruebe el acceso.

Proveer replay local de archivos obtenidos lícitamente para la demo; etiquetar
fecha y modo histórico. Nunca presentar un replay como consulta en vivo.
No consultar por cliente si una misma celda/cuenca sirve a muchos negocios:
agrupar y cachear sin exceder políticas de actualización.

## 4. Contratos de datos por implementar

### Evidencia de origen

`source_id`, `publisher`, `source_url`, `license`, `issued_at`, `retrieved_at`,
`valid_from`, `valid_to`, `source_version`, `content_hash`, `raw_object_path`,
`access_method`, `quality_flags`, `data_mode`.

`data_mode`: observado, pronosticado, histórico, sintético o supuesto.
Guardar originales y extracción normalizada por separado.
Un campo ausente debe seguir ausente, no rellenarse con una invención del LLM.

### Amenaza

`hazard_id`, `hazard_type`, `geometry`, `crs`, `intensity_variable`,
`intensity_unit`, `forecast_reference_time`, `valid_time`, `lead_time`,
`ensemble_member`, `model_version`, `spatial_resolution`, `evidence_id`.

Mantener emisión, tiempo válido y consulta separados. Para probabilidades,
registrar umbral, método y estado de calibración.

### Dependencia económica

`edge_id`, `origin_node`, `destination_node`, `relation_type`, `product_code`,
`sector_code`, `purchase_share`, `sales_share`, `capacity`, `lead_time_days`,
`substitution_limit`, `valid_from`, `valid_to`, `evidence_id`,
`relationship_status`, `reviewed_by`.

`relationship_status`: confirmada, declarada, inferida o sintética.
No convertir procedencia regional de un producto en una compra individual
confirmada. No existe en este registro una API pública de toda la cadena nacional.

### Ejecución del análisis

`run_id`, `input_snapshot_ids`, `model_versions`, `parameters`, `random_seed`,
`horizon`, `direct_impact`, `indirect_impact`, `combined_impact`,
`uncertainty_method`, `assumptions`, `warnings`, `approval_status`.

Separar horizonte meteorológico, periodo de flujo de caja y horizonte crediticio.

## 5. Controles de integración

- Validar esquema, unidades, coordenadas, CRS, duplicados y valores imposibles.
- Definir vigencia por fuente; mensual no basta para alertas de corto plazo.
- Reintentos acotados, backoff, timeout, límites de tamaño y dominios permitidos.
- Mostrar errores, datos vencidos y archivos históricos sin ocultarlos.
- No extraer endpoints privados ni eludir controles de acceso.
- Revisar condiciones de extracción automatizada si no existe API.
- Mantener históricos tal como se conocían para evitar fuga de información.
- Documentar dependencia entre fuentes que reutilizan el mismo modelo.
- Probar el conector con fixtures y respuestas reales permitidas antes de
  marcarlo como integrado.
