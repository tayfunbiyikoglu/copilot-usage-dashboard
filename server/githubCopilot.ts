import { mockDashboardData, type CopilotUser, type DashboardData } from '../src/data'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GITHUB_API_VERSION = '2026-03-10'

type GitHubReportLinks = {
  download_links?: string[]
  report_start_day?: string
  report_end_day?: string
  report_day?: string
}

type ReportRow = Record<string, unknown>

type UsageConfig = {
  token: string
  scope: 'organization' | 'enterprise'
  organization?: string
  enterprise?: string
}

type TeamAssignmentFile = {
  teams?: Array<{ id?: string; name?: string; manager?: string }>
  users?: Array<{ login?: string; displayName?: string; team?: string; teams?: string[]; role?: string }>
}

export function getUsageConfig(): UsageConfig | null {
  const token = process.env.GITHUB_TOKEN?.trim()
  const scope = (process.env.GITHUB_COPILOT_SCOPE ?? 'organization').trim()
  const organization = process.env.GITHUB_ORG?.trim()
  const enterprise = process.env.GITHUB_ENTERPRISE?.trim()

  if (!token) {
    return null
  }

  if (scope === 'enterprise' && enterprise) {
    return { token, scope, enterprise }
  }

  if (organization) {
    return { token, scope: 'organization', organization }
  }

  return null
}

export async function loadGitHubCopilotDashboard(config: UsageConfig): Promise<DashboardData> {
  const [aggregateLinks, userLinks] = await Promise.all([
    getReportLinks(config, 'aggregate'),
    getReportLinks(config, 'users'),
  ])

  const [aggregateRows, userRows] = await Promise.all([
    downloadReportRows(aggregateLinks.download_links ?? []),
    downloadReportRows(userLinks.download_links ?? []),
  ])

  return normalizeReports({
    aggregateRows,
    userRows,
    range: {
      start: aggregateLinks.report_start_day ?? userLinks.report_start_day ?? aggregateLinks.report_day,
      end: aggregateLinks.report_end_day ?? userLinks.report_end_day ?? aggregateLinks.report_day,
    },
  })
}

async function getReportLinks(config: UsageConfig, report: 'aggregate' | 'users'): Promise<GitHubReportLinks> {
  const path =
    config.scope === 'enterprise'
      ? `/enterprises/${config.enterprise}/copilot/metrics/reports/${report === 'aggregate' ? 'enterprise' : 'users'}-28-day/latest`
      : `/orgs/${config.organization}/copilot/metrics/reports/${report === 'aggregate' ? 'organization' : 'users'}-28-day/latest`

  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub ${report} report failed with ${response.status}: ${body.slice(0, 220)}`)
  }

  return (await response.json()) as GitHubReportLinks
}

async function downloadReportRows(downloadLinks: string[]): Promise<ReportRow[]> {
  const reports = await Promise.all(
    downloadLinks.map(async (link) => {
      const response = await fetch(link)

      if (!response.ok) {
        throw new Error(`Report download failed with ${response.status}`)
      }

      return parseReport(await response.text())
    }),
  )

  return reports.flat()
}

function parseReport(text: string): ReportRow[] {
  const trimmed = text.trim()

  if (!trimmed) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    return Array.isArray(parsed) ? parsed.filter(isRecord) : isRecord(parsed) ? [parsed] : []
  } catch {
    return trimmed
      .split('\n')
      .map((line) => JSON.parse(line) as unknown)
      .filter(isRecord)
  }
}

function normalizeReports({
  aggregateRows,
  userRows,
  range,
}: {
  aggregateRows: ReportRow[]
  userRows: ReportRow[]
  range: DashboardData['reportRange']
}): DashboardData {
  if (userRows.length === 0 && aggregateRows.length === 0) {
    return {
      ...mockDashboardData,
      source: 'github',
      generatedAt: new Date().toISOString(),
      reportRange: range,
    }
  }

  const teamAssignments = readTeamAssignments()
  const users = applyTeamAssignments(normalizeUsers(userRows), teamAssignments)
  const dayTotals = aggregateRows.flatMap((row) => getArray(row.day_totals))
  const dailyActive = dayTotals
    .map((row, index) => ({
      day: getString(row.day) ?? `D${index + 1}`,
      active: getNumber(row.daily_active_users),
      chat: getNumber(row.daily_active_chat_users) || getNumber(row.monthly_active_chat_users),
      agent: getNumber(row.daily_active_agent_users) || getNumber(row.monthly_active_agent_users),
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  const languageUsage = summarizeLanguageUsage(userRows)
  const ideDistribution = summarizeIdeUsage(userRows)
  const chatModes = summarizeFeatureUsage(userRows)
  const modelUsage = summarizeModelUsage(userRows)
  const modelTrend = summarizeModelTrend(userRows, modelUsage.slice(0, 6).map((item) => item.model))
  const teamAnalytics = summarizeTeamAnalytics(users)
  const insights = summarizeInsights(users)
  const teams = Array.from(new Set(['All teams', ...users.flatMap((user) => user.teams)])).filter(Boolean)

  return {
    ...mockDashboardData,
    source: 'github',
    generatedAt: new Date().toISOString(),
    reportRange: range,
    teams: teams.length > 1 ? teams : mockDashboardData.teams,
    users: users.length > 0 ? users : mockDashboardData.users,
    dailyActive: dailyActive.length > 0 ? dailyActive : mockDashboardData.dailyActive,
    chatModes: chatModes.length > 0 ? chatModes : mockDashboardData.chatModes,
    modelUsage: modelUsage.length > 0 ? modelUsage : mockDashboardData.modelUsage,
    modelTrend: modelTrend.length > 0 ? modelTrend : mockDashboardData.modelTrend,
    teamAnalytics: teamAnalytics.length > 0 ? teamAnalytics : mockDashboardData.teamAnalytics,
    insights,
    languageUsage: languageUsage.length > 0 ? languageUsage : mockDashboardData.languageUsage,
    ideDistribution: ideDistribution.length > 0 ? ideDistribution : mockDashboardData.ideDistribution,
    cohortBuckets: users.length > 0 ? summarizeCohorts(users) : mockDashboardData.cohortBuckets,
  }
}

function normalizeUsers(rows: ReportRow[]): CopilotUser[] {
  const byLogin = new Map<string, CopilotUser>()

  rows.forEach((row) => {
    const login = getString(row.user_login) ?? `user-${getString(row.user_id) ?? byLogin.size + 1}`
    const existing = byLogin.get(login)
    const generations = getNumber(row.code_generation_activity_count)
    const acceptances = getNumber(row.code_acceptance_activity_count)
    const prompts = getNumber(row.user_initiated_interaction_count) + getNumber(getRecord(row.totals_by_cli)?.prompt_count)
    const locAdded = getNumber(row.loc_added_sum)
    const locDeleted = getNumber(row.loc_deleted_sum)
    const editor = titleCase(getString(getArray(row.totals_by_ide)[0]?.ide) ?? 'Unknown')
    const language = titleCase(getString(getArray(row.totals_by_language_feature)[0]?.language) ?? 'Unknown')
    const model = getString(getArray(row.totals_by_model_feature)[0]?.model) ?? 'Mixed'
    const modelBreakdown = mergeModelBreakdown(existing?.modelBreakdown, row)
    const languageBreakdown = mergeLanguageBreakdown(existing?.languageBreakdown, row)
    const featureBreakdown = mergeFeatureBreakdown(existing?.featureBreakdown, row)
    const activeDays = existing ? existing.activeDays + 1 : 1
    const totalGenerations = (existing?.generations ?? 0) + generations
    const totalAcceptances = (existing?.acceptances ?? 0) + acceptances
    const usedChat = Boolean(row.used_chat) || Boolean(existing?.usedChat)
    const usedAgent = Boolean(row.used_agent) || Boolean(existing?.usedAgent)
    const usedCli = Boolean(row.used_cli) || Boolean(existing?.usedCli)

    byLogin.set(login, {
      login,
      teams: existing?.teams ?? ['Unassigned'],
      activeDays,
      prompts: (existing?.prompts ?? 0) + prompts,
      generations: totalGenerations,
      acceptances: totalAcceptances,
      acceptanceRate: totalGenerations > 0 ? Math.round((totalAcceptances / totalGenerations) * 100) : 0,
      locAdded: (existing?.locAdded ?? 0) + locAdded,
      locDeleted: (existing?.locDeleted ?? 0) + locDeleted,
      usedChat,
      usedAgent,
      usedCli,
      ideVersion: getIdeVersion(row) ?? existing?.ideVersion ?? 'Unknown',
      editor: existing?.editor === 'Unknown' || !existing ? editor : existing.editor,
      model: existing?.model === 'Mixed' || !existing ? model : existing.model,
      language: existing?.language === 'Unknown' || !existing ? language : existing.language,
      status: getUserStatus(activeDays, totalAcceptances, usedAgent),
      recommendation: getRecommendation(activeDays, totalAcceptances, usedAgent, usedChat),
      modelBreakdown,
      languageBreakdown,
      featureBreakdown,
    })
  })

  return Array.from(byLogin.values()).sort((a, b) => b.activeDays - a.activeDays)
}

function mergeModelBreakdown(existing: CopilotUser['modelBreakdown'] = [], row: ReportRow): CopilotUser['modelBreakdown'] {
  const totals = new Map(existing.map((item) => [item.model, { ...item }]))

  getArray(row.totals_by_model_feature).forEach((item) => {
    const model = getString(item.model) ?? 'Unknown'
    const current = totals.get(model) ?? { model, generations: 0, acceptances: 0, prompts: 0, acceptanceRate: 0 }
    current.generations += getNumber(item.code_generation_activity_count)
    current.acceptances += getNumber(item.code_acceptance_activity_count)
    current.prompts += getNumber(item.user_initiated_interaction_count)
    current.acceptanceRate = current.generations > 0 ? Math.round((current.acceptances / current.generations) * 100) : 0
    totals.set(model, current)
  })

  return Array.from(totals.values()).sort((a, b) => b.generations - a.generations)
}

function mergeLanguageBreakdown(existing: CopilotUser['languageBreakdown'] = [], row: ReportRow): CopilotUser['languageBreakdown'] {
  const totals = new Map(existing.map((item) => [item.language, { ...item }]))

  getArray(row.totals_by_language_feature).forEach((item) => {
    const language = titleCase(getString(item.language) ?? 'Unknown')
    const current = totals.get(language) ?? { language, generations: 0, acceptances: 0, loc: 0 }
    current.generations += getNumber(item.code_generation_activity_count)
    current.acceptances += getNumber(item.code_acceptance_activity_count)
    current.loc += getNumber(item.loc_added_sum)
    totals.set(language, current)
  })

  return Array.from(totals.values()).sort((a, b) => b.loc - a.loc)
}

function mergeFeatureBreakdown(existing: CopilotUser['featureBreakdown'] = [], row: ReportRow): CopilotUser['featureBreakdown'] {
  const totals = new Map(existing.map((item) => [item.feature, { ...item }]))

  getArray(row.totals_by_feature).forEach((item) => {
    const feature = titleCase((getString(item.feature) ?? 'Unknown').replaceAll('_', ' '))
    const current = totals.get(feature) ?? { feature, value: 0 }
    current.value += getNumber(item.user_initiated_interaction_count) + getNumber(item.code_generation_activity_count)
    totals.set(feature, current)
  })

  return Array.from(totals.values()).sort((a, b) => b.value - a.value)
}

function readTeamAssignments(): TeamAssignmentFile | undefined {
  try {
    const file = readFileSync(resolve(process.cwd(), 'config/teamAssignments.json'), 'utf8')
    return JSON.parse(file) as TeamAssignmentFile
  } catch {
    return undefined
  }
}

function applyTeamAssignments(users: CopilotUser[], assignmentFile: TeamAssignmentFile | undefined): CopilotUser[] {
  if (!assignmentFile?.users?.length) {
    return users
  }

  const teamsByLogin = new Map(
    assignmentFile.users
      .filter((entry) => entry.login)
      .map((entry) => [
        entry.login?.toLowerCase(),
        entry.teams?.length ? entry.teams : entry.team ? [entry.team] : ['Unassigned'],
      ]),
  )
  const peopleByLogin = new Map(
    assignmentFile.users
      .filter((entry) => entry.login)
      .map((entry) => [entry.login?.toLowerCase(), { displayName: entry.displayName, role: entry.role }]),
  )

  return users.map((user) => ({
    ...user,
    teams: teamsByLogin.get(user.login.toLowerCase()) ?? user.teams,
    displayName: peopleByLogin.get(user.login.toLowerCase())?.displayName,
    role: peopleByLogin.get(user.login.toLowerCase())?.role,
  }))
}

function summarizeLanguageUsage(rows: ReportRow[]) {
  const totals = new Map<string, { language: string; users: Set<string>; acceptances: number; generations: number; loc: number }>()

  rows.forEach((row) => {
    const login = getString(row.user_login) ?? 'unknown'
    getArray(row.totals_by_language_feature).forEach((item) => {
      const language = titleCase(getString(item.language) ?? 'Unknown')
      const current = totals.get(language) ?? { language, users: new Set<string>(), acceptances: 0, generations: 0, loc: 0 }
      current.users.add(login)
      current.acceptances += getNumber(item.code_acceptance_activity_count)
      current.generations += getNumber(item.code_generation_activity_count)
      current.loc += getNumber(item.loc_added_sum)
      totals.set(language, current)
    })
  })

  return Array.from(totals.values())
    .map((item) => ({
      language: item.language,
      users: item.users.size,
      accept: item.generations > 0 ? Math.round((item.acceptances / item.generations) * 100) : 0,
      loc: item.loc,
    }))
    .sort((a, b) => b.loc - a.loc)
    .slice(0, 8)
}

function summarizeIdeUsage(rows: ReportRow[]) {
  const totals = new Map<string, Set<string>>()

  rows.forEach((row) => {
    const login = getString(row.user_login) ?? 'unknown'
    getArray(row.totals_by_ide).forEach((item) => {
      const editor = titleCase(getString(item.ide) ?? 'Unknown')
      totals.set(editor, (totals.get(editor) ?? new Set<string>()).add(login))
    })
  })

  return Array.from(totals.entries())
    .map(([editor, userSet]) => ({ editor, users: userSet.size }))
    .sort((a, b) => b.users - a.users)
}

function summarizeModelUsage(rows: ReportRow[]) {
  const totals = new Map<
    string,
    { model: string; users: Set<string>; prompts: number; generations: number; acceptances: number; loc: number }
  >()

  rows.forEach((row) => {
    const login = getString(row.user_login) ?? 'unknown'
    getArray(row.totals_by_model_feature).forEach((item) => {
      const model = getString(item.model) ?? 'Unknown'
      const current = totals.get(model) ?? { model, users: new Set<string>(), prompts: 0, generations: 0, acceptances: 0, loc: 0 }
      current.users.add(login)
      current.prompts += getNumber(item.user_initiated_interaction_count)
      current.generations += getNumber(item.code_generation_activity_count)
      current.acceptances += getNumber(item.code_acceptance_activity_count)
      current.loc += getNumber(item.loc_added_sum)
      totals.set(model, current)
    })
  })

  return Array.from(totals.values())
    .map((item) => ({
      model: item.model,
      users: item.users.size,
      prompts: item.prompts,
      generations: item.generations,
      acceptances: item.acceptances,
      acceptanceRate: item.generations > 0 ? Math.round((item.acceptances / item.generations) * 100) : 0,
      loc: item.loc,
    }))
    .sort((a, b) => b.generations - a.generations)
}

function summarizeModelTrend(rows: ReportRow[], modelNames: string[]): Array<Record<string, string | number>> {
  const days = new Map<string, Record<string, string | number>>()

  rows.forEach((row) => {
    const day = getString(row.day) ?? getString(row.date) ?? 'Unknown'
    const current = days.get(day) ?? { day }

    getArray(row.totals_by_model_feature).forEach((item) => {
      const model = getString(item.model) ?? 'Unknown'
      if (!modelNames.includes(model)) {
        return
      }

      current[model] = getNumber(current[model]) + getNumber(item.code_generation_activity_count)
    })

    days.set(day, current)
  })

  return Array.from(days.values())
    .map((row) => {
      modelNames.forEach((model) => {
        row[model] = getNumber(row[model])
      })
      return row
    })
    .sort((a, b) => String(a.day).localeCompare(String(b.day)))
}

function summarizeTeamAnalytics(users: CopilotUser[]): DashboardData['teamAnalytics'] {
  const teamNames = Array.from(new Set(users.flatMap((user) => user.teams))).filter((team) => team !== 'All teams')

  return teamNames
    .map((team) => {
      const teamUsers = users.filter((user) => user.teams.includes(team))
      const activeUsers = teamUsers.filter((user) => user.activeDays > 0).length
      const generations = sum(teamUsers.map((user) => user.generations))
      const acceptances = sum(teamUsers.map((user) => user.acceptances))
      const agentUsers = teamUsers.filter((user) => user.usedAgent).length
      const modelCounts = new Map<string, number>()

      teamUsers.forEach((user) => {
        modelCounts.set(user.model, (modelCounts.get(user.model) ?? 0) + user.generations)
      })

      const primaryModel =
        Array.from(modelCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown'

      return {
        team,
        users: teamUsers.length,
        activeUsers,
        adoptionRate: teamUsers.length > 0 ? Math.round((activeUsers / teamUsers.length) * 100) : 0,
        chatUsers: teamUsers.filter((user) => user.usedChat).length,
        agentUsers,
        prompts: sum(teamUsers.map((user) => user.prompts)),
        generations,
        acceptances,
        acceptanceRate: generations > 0 ? Math.round((acceptances / generations) * 100) : 0,
        locAdded: sum(teamUsers.map((user) => user.locAdded)),
        primaryModel,
        signal: getTeamSignal(teamUsers, agentUsers, generations > 0 ? Math.round((acceptances / generations) * 100) : 0),
      }
    })
    .sort((a, b) => b.activeUsers - a.activeUsers)
}

function summarizeInsights(users: CopilotUser[]): DashboardData['insights'] {
  return {
    seatsToReclaim: users.filter((user) => user.activeDays === 0 || user.generations === 0).slice(0, 12),
    usersToCoach: users
      .filter((user) => user.activeDays > 0 && (user.acceptanceRate < 20 || !user.usedChat))
      .sort((a, b) => a.acceptanceRate - b.acceptanceRate)
      .slice(0, 12),
    champions: users
      .filter((user) => user.status === 'Power user')
      .sort((a, b) => b.acceptances - a.acceptances)
      .slice(0, 12),
    agentOpportunities: users
      .filter((user) => user.usedChat && !user.usedAgent)
      .sort((a, b) => b.activeDays - a.activeDays)
      .slice(0, 12),
    staleIdeUsers: users.filter((user) => isPotentiallyStaleIde(user.ideVersion)).slice(0, 12),
  }
}

function getTeamSignal(teamUsers: CopilotUser[], agentUsers: number, acceptanceRate: number) {
  if (teamUsers.length === 0) return 'No assignment'
  if (agentUsers / teamUsers.length >= 0.7 && acceptanceRate >= 25) return 'Ready for advanced rollout'
  if (acceptanceRate < 20) return 'Coach acceptance quality'
  if (agentUsers / teamUsers.length < 0.4) return 'Agent adoption opportunity'
  return 'Healthy adoption'
}

function isPotentiallyStaleIde(version: string) {
  const yearMatch = version.match(/\b(20\d{2})\b/)
  if (yearMatch && Number(yearMatch[1]) < 2026) return true

  const semverMatch = version.match(/\b1\.(\d+)\b/)
  return Boolean(semverMatch && Number(semverMatch[1]) < 100)
}

function summarizeFeatureUsage(rows: ReportRow[]) {
  const featureMap = new Map<string, number>()

  rows.forEach((row) => {
    getArray(row.totals_by_feature).forEach((item) => {
      const feature = titleCase((getString(item.feature) ?? 'Unknown').replaceAll('_', ' '))
      const value = getNumber(item.user_initiated_interaction_count) + getNumber(item.code_generation_activity_count)
      featureMap.set(feature, (featureMap.get(feature) ?? 0) + value)
    })
  })

  return Array.from(featureMap.entries()).map(([mode, value]) => ({ mode, value }))
}

function summarizeCohorts(normalizedUsers: CopilotUser[]) {
  const buckets = [
    { bucket: '0', users: 0 },
    { bucket: '1-5', users: 0 },
    { bucket: '6-10', users: 0 },
    { bucket: '11-15', users: 0 },
    { bucket: '16-20', users: 0 },
    { bucket: '21+', users: 0 },
  ]

  normalizedUsers.forEach((user) => {
    if (user.activeDays === 0) buckets[0].users += 1
    else if (user.activeDays <= 5) buckets[1].users += 1
    else if (user.activeDays <= 10) buckets[2].users += 1
    else if (user.activeDays <= 15) buckets[3].users += 1
    else if (user.activeDays <= 20) buckets[4].users += 1
    else buckets[5].users += 1
  })

  return buckets
}

function getUserStatus(activeDays: number, acceptances: number, usedAgent: boolean): CopilotUser['status'] {
  if (activeDays === 0) return 'Inactive'
  if (usedAgent && activeDays >= 12 && acceptances >= 20) return 'Power user'
  if (activeDays >= 6 || acceptances >= 10) return 'Growing'
  return 'Needs onboarding'
}

function getRecommendation(activeDays: number, acceptances: number, usedAgent: boolean, usedChat: boolean) {
  if (activeDays === 0) return 'Confirm license need'
  if (!usedChat) return 'Run IDE setup check'
  if (!usedAgent) return 'Introduce agent mode'
  if (acceptances < 10) return 'Coach on acceptance quality'
  return 'Invite to champion program'
}

function getIdeVersion(row: ReportRow) {
  const ide = getArray(row.totals_by_ide)[0]
  return getString(getRecord(ide?.last_known_ide_version)?.ide_version)
}

function getArray(value: unknown): ReportRow[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function getRecord(value: unknown): ReportRow | undefined {
  return isRecord(value) ? value : undefined
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function getNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function isRecord(value: unknown): value is ReportRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
