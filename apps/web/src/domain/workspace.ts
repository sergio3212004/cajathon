/** Task-based navigation. Titles describe the workspace, never a marketing claim. */
export const workspaces = [
  { id: 'monitoring', label: 'Monitoreo', icon: 'i-lucide-map' },
  { id: 'supply', label: 'Abastecimiento', icon: 'i-lucide-network' },
  { id: 'portfolio', label: 'Riesgo de cartera', icon: 'i-lucide-chart-no-axes-combined' },
  { id: 'interventions', label: 'Intervenciones', icon: 'i-lucide-shield-check' },
  { id: 'followup', label: 'Seguimiento', icon: 'i-lucide-clipboard-check' },
  { id: 'settings', label: 'Configuración', icon: 'i-lucide-settings-2' },
] as const
export type WorkspaceId = typeof workspaces[number]['id']
export function workspaceFromHash(hash: string): WorkspaceId {
  const id = hash.replace(/^#/, '')
  return workspaces.find(w => w.id === id)?.id ?? 'monitoring'
}
