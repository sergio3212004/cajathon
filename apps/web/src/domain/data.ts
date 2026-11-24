import type { Business } from './risk'

const seeds = [
  ['B01', 'Agroindustrias El Valle', 'Rosa Vásquez', 'Agricultura', 'Laredo', 73, 38, .94, 14500, 6800, 28000],
  ['B02', 'Abarrotes Doña Carmen', 'Carmen Ríos', 'Comercio', 'El Porvenir', 60, 50, .88, 9800, 5100, 18000],
  ['B03', 'Calzados El Progreso', 'Miguel Torres', 'Manufactura', 'El Porvenir', 66, 43, .84, 12500, 6400, 24000],
  ['B04', 'Vivero Los Laureles', 'Ana Mendoza', 'Agricultura', 'Laredo', 82, 29, .82, 11000, 5300, 22000],
  ['B05', 'Panadería San José', 'José Castillo', 'Comercio', 'Trujillo', 49, 62, .69, 10500, 5600, 16000],
  ['B06', 'Textiles Esperanza', 'Lucía Pérez', 'Manufactura', 'La Esperanza', 43, 29, .72, 13200, 7100, 26000],
  ['B07', 'Restaurante El Muelle', 'Pedro Ruiz', 'Servicios', 'Huanchaco', 28, 42, .65, 15000, 8400, 21000],
  ['B08', 'Ferretería del Norte', 'Elena Flores', 'Comercio', 'Trujillo', 53, 46, .56, 18000, 9500, 32000],
  ['B09', 'Taller Hermanos Díaz', 'Carlos Díaz', 'Servicios', 'La Esperanza', 38, 37, .48, 9500, 4800, 15000],
  ['B10', 'Bodega Las Palmeras', 'María Silva', 'Comercio', 'Huanchaco', 33, 55, .42, 8200, 4400, 12000],
  ['B11', 'Confecciones Marisol', 'Marisol León', 'Manufactura', 'Trujillo', 47, 76, .32, 11500, 5900, 20000],
  ['B12', 'Servicios La Merced', 'Luis Sánchez', 'Servicios', 'Trujillo', 60, 72, .25, 10200, 5000, 17000],
] as const
export const businesses: Business[] = seeds.map((s, i) => ({
  id: s[0], name: s[1], owner: s[2], sector: s[3], district: s[4],
  x: s[5], y: s[6], exposure: s[7], income: s[8], expenses: s[9], principal: s[10],
  assets: [
    { id: `${s[0]}-1`, name: s[3] === 'Agricultura' ? 'Cultivos y cosecha' : 'Inventario y mercadería', value: 24000 + i * 1300, vulnerability: .8 - i * .025, measure: s[3] === 'Agricultura' ? 'Habilitar drenajes y proteger la cosecha' : 'Trasladar mercadería a una zona elevada', cost: 650 + i * 40, reduction: .34 },
    { id: `${s[0]}-2`, name: s[3] === 'Agricultura' ? 'Sistema de riego' : 'Maquinaria y equipos', value: 18000 + i * 900, vulnerability: .6 - i * .02, measure: 'Elevar y cubrir equipos esenciales', cost: 420 + i * 30, reduction: .28 },
    { id: `${s[0]}-3`, name: 'Local e instalaciones', value: 32000 + i * 1100, vulnerability: .45 - i * .015, measure: 'Instalar barreras y revisar desagües', cost: 950 + i * 35, reduction: .2 },
  ],
}))
