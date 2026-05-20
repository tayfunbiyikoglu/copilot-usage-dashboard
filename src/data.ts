export type AdoptionStatus = 'Power user' | 'Growing' | 'Needs onboarding' | 'Inactive'

export type CopilotUser = {
  login: string
  displayName?: string
  teams: string[]
  role?: string
  activeDays: number
  prompts: number
  generations: number
  acceptances: number
  acceptanceRate: number
  locAdded: number
  locDeleted: number
  usedChat: boolean
  usedAgent: boolean
  usedCli: boolean
  ideVersion: string
  editor: string
  model: string
  language: string
  status: AdoptionStatus
  recommendation: string
  modelBreakdown?: Array<{ model: string; generations: number; acceptances: number; prompts: number; acceptanceRate: number }>
  languageBreakdown?: Array<{ language: string; generations: number; acceptances: number; loc: number }>
  featureBreakdown?: Array<{ feature: string; value: number }>
}

export type DashboardData = {
  source: 'mock' | 'github'
  generatedAt: string
  reportRange?: {
    start?: string
    end?: string
  }
  teams: string[]
  users: CopilotUser[]
  dailyActive: Array<{ day: string; active: number; chat: number; agent: number }>
  chatModes: Array<{ mode: string; value: number }>
  modelTrend: Array<Record<string, string | number>>
  modelUsage: Array<{
    model: string
    users: number
    prompts: number
    generations: number
    acceptances: number
    acceptanceRate: number
    loc: number
  }>
  teamAnalytics: Array<{
    team: string
    users: number
    activeUsers: number
    adoptionRate: number
    chatUsers: number
    agentUsers: number
    prompts: number
    generations: number
    acceptances: number
    acceptanceRate: number
    locAdded: number
    primaryModel: string
    signal: string
  }>
  insights: {
    seatsToReclaim: CopilotUser[]
    usersToCoach: CopilotUser[]
    champions: CopilotUser[]
    agentOpportunities: CopilotUser[]
    staleIdeUsers: CopilotUser[]
  }
  languageUsage: Array<{ language: string; users: number; accept: number; loc: number }>
  ideDistribution: Array<{ editor: string; users: number }>
  cohortBuckets: Array<{ bucket: string; users: number }>
}

export const teams = [
  'All teams',
  'Payments',
  'Backend Platform',
  'Mobile Apps',
  'Data Platform',
  'Web Frontend',
  'Security',
]

export const users: CopilotUser[] = [
  {
    login: 'login42',
    teams: ['Payments', 'Backend Platform'],
    activeDays: 25,
    prompts: 446,
    generations: 1184,
    acceptances: 421,
    acceptanceRate: 36,
    locAdded: 5820,
    locDeleted: 2140,
    usedChat: true,
    usedAgent: true,
    usedCli: true,
    ideVersion: 'VS Code 1.101',
    editor: 'VS Code',
    model: 'GPT-5.1-Codex',
    language: 'TypeScript',
    status: 'Power user',
    recommendation: 'Invite to champion program',
  },
  {
    login: 'login18',
    teams: ['Web Frontend'],
    activeDays: 22,
    prompts: 338,
    generations: 904,
    acceptances: 291,
    acceptanceRate: 32,
    locAdded: 4090,
    locDeleted: 1334,
    usedChat: true,
    usedAgent: true,
    usedCli: false,
    ideVersion: 'JetBrains 2026.1',
    editor: 'JetBrains',
    model: 'Claude Sonnet 4.5',
    language: 'JavaScript',
    status: 'Power user',
    recommendation: 'Share agent workflow',
  },
  {
    login: 'login73',
    teams: ['Mobile Apps'],
    activeDays: 19,
    prompts: 292,
    generations: 735,
    acceptances: 176,
    acceptanceRate: 24,
    locAdded: 3210,
    locDeleted: 998,
    usedChat: true,
    usedAgent: false,
    usedCli: false,
    ideVersion: 'Xcode 18.0',
    editor: 'Xcode',
    model: 'GPT-5.1',
    language: 'Swift',
    status: 'Growing',
    recommendation: 'Introduce agent mode',
  },
  {
    login: 'login09',
    teams: ['Data Platform'],
    activeDays: 17,
    prompts: 251,
    generations: 618,
    acceptances: 156,
    acceptanceRate: 25,
    locAdded: 2875,
    locDeleted: 1188,
    usedChat: true,
    usedAgent: true,
    usedCli: true,
    ideVersion: 'VS Code 1.100',
    editor: 'VS Code',
    model: 'Gemini 2.5 Pro',
    language: 'Python',
    status: 'Growing',
    recommendation: 'Coach on acceptance quality',
  },
  {
    login: 'login55',
    teams: ['Security'],
    activeDays: 12,
    prompts: 118,
    generations: 244,
    acceptances: 52,
    acceptanceRate: 21,
    locAdded: 1120,
    locDeleted: 804,
    usedChat: true,
    usedAgent: false,
    usedCli: true,
    ideVersion: 'Neovim 0.11',
    editor: 'Neovim',
    model: 'GPT-5.1-Codex',
    language: 'Go',
    status: 'Growing',
    recommendation: 'Expand CLI examples',
  },
  {
    login: 'login31',
    teams: ['Payments'],
    activeDays: 8,
    prompts: 74,
    generations: 181,
    acceptances: 31,
    acceptanceRate: 17,
    locAdded: 744,
    locDeleted: 286,
    usedChat: true,
    usedAgent: false,
    usedCli: false,
    ideVersion: 'VS Code 1.99',
    editor: 'VS Code',
    model: 'GPT-4.1',
    language: 'Kotlin',
    status: 'Needs onboarding',
    recommendation: 'Pair on chat edit flows',
  },
  {
    login: 'login64',
    teams: ['Backend Platform'],
    activeDays: 6,
    prompts: 55,
    generations: 132,
    acceptances: 20,
    acceptanceRate: 15,
    locAdded: 618,
    locDeleted: 174,
    usedChat: false,
    usedAgent: false,
    usedCli: false,
    ideVersion: 'JetBrains 2025.3',
    editor: 'JetBrains',
    model: 'GPT-4.1',
    language: 'Java',
    status: 'Needs onboarding',
    recommendation: 'Run IDE setup check',
  },
  {
    login: 'login27',
    teams: ['Web Frontend'],
    activeDays: 4,
    prompts: 28,
    generations: 61,
    acceptances: 7,
    acceptanceRate: 11,
    locAdded: 240,
    locDeleted: 88,
    usedChat: false,
    usedAgent: false,
    usedCli: false,
    ideVersion: 'VS Code 1.98',
    editor: 'VS Code',
    model: 'GPT-4.1',
    language: 'CSS',
    status: 'Needs onboarding',
    recommendation: 'Schedule first-use session',
  },
  {
    login: 'login88',
    teams: ['Mobile Apps'],
    activeDays: 1,
    prompts: 8,
    generations: 16,
    acceptances: 1,
    acceptanceRate: 6,
    locAdded: 74,
    locDeleted: 22,
    usedChat: false,
    usedAgent: false,
    usedCli: false,
    ideVersion: 'Android Studio 2026.1',
    editor: 'Android Studio',
    model: 'GPT-4.1',
    language: 'Kotlin',
    status: 'Inactive',
    recommendation: 'Confirm license need',
  },
  {
    login: 'login12',
    teams: ['Security'],
    activeDays: 0,
    prompts: 0,
    generations: 0,
    acceptances: 0,
    acceptanceRate: 0,
    locAdded: 0,
    locDeleted: 0,
    usedChat: false,
    usedAgent: false,
    usedCli: false,
    ideVersion: 'Unknown',
    editor: 'Unknown',
    model: 'None',
    language: 'None',
    status: 'Inactive',
    recommendation: 'Reclaim or onboard',
  },
]

export const dailyActive = Array.from({ length: 28 }, (_, index) => ({
  day: `D${index + 1}`,
  active: Math.round(84 + Math.sin(index / 3) * 14 + index * 1.8),
  chat: Math.round(54 + Math.cos(index / 4) * 8 + index * 1.2),
  agent: Math.round(14 + Math.sin(index / 2.7) * 5 + index * 0.8),
}))

export const chatModes = [
  { mode: 'Ask', value: 4260 },
  { mode: 'Edit', value: 2180 },
  { mode: 'Plan', value: 1340 },
  { mode: 'Agent', value: 1688 },
  { mode: 'Custom', value: 790 },
]

export const modelTrend = [
  { day: 'W1', 'GPT-5.1-Codex': 30, 'GPT-5.1': 42, 'Claude Sonnet 4.5': 18, 'Gemini 2.5 Pro': 10 },
  { day: 'W2', 'GPT-5.1-Codex': 34, 'GPT-5.1': 37, 'Claude Sonnet 4.5': 19, 'Gemini 2.5 Pro': 10 },
  { day: 'W3', 'GPT-5.1-Codex': 41, 'GPT-5.1': 31, 'Claude Sonnet 4.5': 20, 'Gemini 2.5 Pro': 8 },
  { day: 'W4', 'GPT-5.1-Codex': 47, 'GPT-5.1': 28, 'Claude Sonnet 4.5': 18, 'Gemini 2.5 Pro': 7 },
]

export const modelUsage = [
  { model: 'GPT-5.1-Codex', users: 31, prompts: 1400, generations: 4800, acceptances: 1620, acceptanceRate: 34, loc: 14200 },
  { model: 'GPT-5.1', users: 22, prompts: 960, generations: 3100, acceptances: 910, acceptanceRate: 29, loc: 9200 },
  { model: 'Claude Sonnet 4.5', users: 17, prompts: 720, generations: 2100, acceptances: 610, acceptanceRate: 29, loc: 6400 },
  { model: 'Gemini 2.5 Pro', users: 9, prompts: 340, generations: 980, acceptances: 250, acceptanceRate: 26, loc: 2600 },
]

export const teamAnalytics = [
  {
    team: 'Payments',
    users: 2,
    activeUsers: 2,
    adoptionRate: 100,
    chatUsers: 2,
    agentUsers: 1,
    prompts: 520,
    generations: 1365,
    acceptances: 452,
    acceptanceRate: 33,
    locAdded: 6564,
    primaryModel: 'GPT-5.1-Codex',
    signal: 'Strong adoption',
  },
]

export const insights = {
  seatsToReclaim: users.filter((user) => user.status === 'Inactive'),
  usersToCoach: users.filter((user) => user.status === 'Needs onboarding'),
  champions: users.filter((user) => user.status === 'Power user'),
  agentOpportunities: users.filter((user) => user.usedChat && !user.usedAgent),
  staleIdeUsers: users.filter((user) => user.ideVersion.includes('1.98') || user.ideVersion.includes('2025')),
}

export const languageUsage = [
  { language: 'TypeScript', users: 64, accept: 34, loc: 18420 },
  { language: 'Python', users: 41, accept: 28, loc: 11970 },
  { language: 'Go', users: 24, accept: 25, loc: 6230 },
  { language: 'Java', users: 22, accept: 21, loc: 5380 },
  { language: 'Kotlin', users: 16, accept: 18, loc: 3140 },
  { language: 'Swift', users: 11, accept: 20, loc: 2260 },
]

export const ideDistribution = [
  { editor: 'VS Code', users: 118 },
  { editor: 'JetBrains', users: 46 },
  { editor: 'Neovim', users: 17 },
  { editor: 'Xcode', users: 12 },
  { editor: 'Android Studio', users: 9 },
]

export const cohortBuckets = [
  { bucket: '0', users: 27 },
  { bucket: '1-5', users: 34 },
  { bucket: '6-10', users: 42 },
  { bucket: '11-15', users: 38 },
  { bucket: '16-20', users: 31 },
  { bucket: '21+', users: 24 },
]

export const mockDashboardData: DashboardData = {
  source: 'mock',
  generatedAt: new Date().toISOString(),
  reportRange: {
    start: 'Mock latest 28 days',
    end: 'Mock',
  },
  teams,
  users,
  dailyActive,
  chatModes,
  modelTrend,
  modelUsage,
  teamAnalytics,
  insights,
  languageUsage,
  ideDistribution,
  cohortBuckets,
}
