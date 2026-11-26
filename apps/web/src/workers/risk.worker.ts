import { analyze, type ClimateScenario, type Client } from '../domain/escudo'

self.onmessage = (event: MessageEvent<{ id: number; clients: Client[]; scenario: ClimateScenario; budget: number }>) => {
  try {
    const { id, clients, scenario, budget } = event.data
    self.postMessage({ id, result: analyze(clients, scenario, budget) })
  } catch (error) {
    self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : 'Error de simulación' })
  }
}
