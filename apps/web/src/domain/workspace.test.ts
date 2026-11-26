import { describe, expect, test } from 'bun:test'
import { workspaces, workspaceFromHash } from './workspace'

describe('Navegación operativa del MVP', () => {
  test('cada sección tiene identidad única, título concreto y enlace estable', () => {
    expect(new Set(workspaces.map(w => w.id)).size).toBe(workspaces.length)
    expect(new Set(workspaces.map(w => w.label)).size).toBe(workspaces.length)
    expect(workspaces.map(w => w.label)).toEqual([
      'Monitoreo', 'Abastecimiento', 'Riesgo de cartera', 'Intervenciones', 'Seguimiento', 'Configuración',
    ])
    for (const workspace of workspaces) expect(workspaceFromHash(`#${workspace.id}`)).toBe(workspace.id)
  })
  test('la entrada sin sección o desconocida abre monitoreo', () => {
    expect(workspaceFromHash('')).toBe('monitoring')
    expect(workspaceFromHash('#desconocida')).toBe('monitoring')
    expect(workspaceFromHash('#main-content')).toBe('monitoring')
  })
})
