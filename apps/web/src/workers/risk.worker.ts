import { analyze, type ClimateScenario, type Client, type PlanOverrides } from '../domain/escudo'

self.onmessage = (event: MessageEvent<{ id: number; clients: Client[]; scenario: ClimateScenario; budget: number; overrides?: PlanOverrides }>) => {
  try {
    const { id, clients, scenario, budget, overrides } = event.data
    self.postMessage({ id, result: analyze(clients, scenario, budget, overrides) })
  } catch (error) {
    self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : 'Error de simulación' })
  }
}
