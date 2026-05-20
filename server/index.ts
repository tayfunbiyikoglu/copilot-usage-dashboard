import 'dotenv/config'
import express from 'express'
import { getUsageConfig, loadGitHubCopilotDashboard } from './githubCopilot'
import { mockDashboardData } from '../src/data'

const app = express()
const port = Number(process.env.PORT ?? 8787)

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/copilot/usage', async (_request, response) => {
  const config = getUsageConfig()

  if (!config) {
    response.json({
      ...mockDashboardData,
      mode: 'mock',
      message: 'Set GITHUB_TOKEN and GITHUB_ORG or GITHUB_ENTERPRISE in .env to load live GitHub metrics.',
    })
    return
  }

  try {
    const dashboard = await loadGitHubCopilotDashboard(config)
    response.json({
      ...dashboard,
      mode: 'live',
      message: `Loaded from GitHub ${config.scope} usage metrics reports.`,
    })
  } catch (error) {
    response.status(502).json({
      ...mockDashboardData,
      mode: 'mock',
      message: error instanceof Error ? error.message : 'GitHub usage metrics request failed.',
    })
  }
})

app.listen(port, () => {
  console.log(`Copilot dashboard API listening on http://127.0.0.1:${port}`)
})
