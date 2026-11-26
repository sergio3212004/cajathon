export const taskStages = ['Pendiente', 'Aprobada', 'Entrega fallida', 'Comunicada', 'Ejecutada', 'Cerrada'] as const
export type TaskStage = typeof taskStages[number]
export interface TaskEvent { stage: TaskStage; evidence: string; date: string }
/** Local demonstration only: no bank authorization or external communication. */
export function transitionTask(current: TaskStage, next: TaskStage, input: {
  reviewed: boolean; currentScenario: boolean; evidence: string
}): TaskStage {
  if (!input.currentScenario) throw new Error('Espera un análisis vigente antes de registrar una acción.')
  if (!input.reviewed) throw new Error('Primero registra la revisión humana de este cliente y escenario.')
  if (input.evidence.trim().length < 8) throw new Error('Registra al menos 8 caracteres de evidencia sintética.')
  const allowed: Record<TaskStage, TaskStage[]> = {
    Pendiente: ['Aprobada'], Aprobada: ['Comunicada', 'Entrega fallida'],
    'Entrega fallida': ['Comunicada'], Comunicada: ['Ejecutada'], Ejecutada: ['Cerrada'], Cerrada: [],
  }
  if (!allowed[current].includes(next)) throw new Error('Transición de seguimiento no permitida.')
  return next
}
