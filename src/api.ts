import { mockDashboardData, type DashboardData } from './data'

export type DashboardResponse = DashboardData & {
  mode: 'live' | 'mock'
  message?: string
}

export async function loadDashboardData(): Promise<DashboardResponse> {
  try {
    const response = await fetch('/api/copilot/usage')

    if (!response.ok) {
      throw new Error(`Dashboard API returned ${response.status}`)
    }

    return (await response.json()) as DashboardResponse
  } catch (error) {
    return {
      ...mockDashboardData,
      mode: 'mock',
      message: error instanceof Error ? error.message : 'Dashboard API unavailable',
    }
  }
}
