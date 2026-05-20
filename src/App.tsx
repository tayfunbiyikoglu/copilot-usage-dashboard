import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Filter,
  HelpCircle,
  LayoutDashboard,
  Moon,
  Network,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { loadDashboardData, type DashboardResponse } from './api'
import { mockDashboardData, type AdoptionStatus, type CopilotUser } from './data'
import './App.css'

type Tab = 'Overview' | 'Users' | 'Teams' | 'Models' | 'Actions'
type HelpTopic = {
  term: string
  short: string
  details: string
}

type SavedView = {
  name: string
  scope: string
  tab: Tab
  status: AdoptionStatus | 'All statuses'
  model: string
  description: string
}

const statusOrder: AdoptionStatus[] = ['Power user', 'Growing', 'Needs onboarding', 'Inactive']
const statusColors: Record<AdoptionStatus, string> = {
  'Power user': '#1f883d',
  Growing: '#0969da',
  'Needs onboarding': '#bf8700',
  Inactive: '#cf222e',
}

const palette = ['#0969da', '#1f883d', '#8250df', '#bf8700', '#cf222e', '#57606a', '#0969da99', '#1f883d99']

const savedViews: SavedView[] = [
  {
    name: 'Executive adoption',
    scope: 'Org',
    tab: 'Overview',
    status: 'All statuses',
    model: 'All models',
    description: 'Org health, adoption, trend, and value indicators.',
  },
  {
    name: 'Manager coaching',
    scope: 'Users',
    tab: 'Actions',
    status: 'Needs onboarding',
    model: 'All models',
    description: 'Users who need enablement, setup help, or quality coaching.',
  },
  {
    name: 'License cleanup',
    scope: 'Seats',
    tab: 'Actions',
    status: 'Inactive',
    model: 'All models',
    description: 'Inactive or zero-output users to reclaim or re-onboard.',
  },
  {
    name: 'Agent rollout',
    scope: 'Teams',
    tab: 'Teams',
    status: 'All statuses',
    model: 'All models',
    description: 'Teams and users ready for deeper agent adoption.',
  },
  {
    name: 'Model performance',
    scope: 'Models',
    tab: 'Models',
    status: 'All statuses',
    model: 'All models',
    description: 'Exact model usage, including separate Opus/GPT versions when reported.',
  },
]

const glossary: HelpTopic[] = [
  {
    term: 'Coach on acceptance quality',
    short: 'A user is active but accepts a low share of generated code.',
    details:
      'This usually means they are trying Copilot but not getting useful output consistently. Good next actions are prompt examples, language-specific patterns, or pairing with a power user.',
  },
  {
    term: 'Engaged users',
    short: 'Users with meaningful accepted output in the report window.',
    details:
      'The dashboard currently treats users with more than 25 accepted suggestions as engaged. This is a product heuristic, not a GitHub-native field.',
  },
  {
    term: 'Agent users',
    short: 'Users who used agent-oriented Copilot features.',
    details:
      'This includes agent/edit style workflows when the GitHub usage report marks those feature groups. Use this to track deeper workflow adoption beyond basic completion.',
  },
  {
    term: 'Accepted code',
    short: 'Generated code that users accepted into their editor or workflow.',
    details:
      'Acceptance rate is acceptances divided by generations. It is useful directionally, but should be read with volume, language, and task type.',
  },
  {
    term: 'Model split',
    short: 'Which model IDs contributed to a user or team’s activity.',
    details:
      'Model IDs are preserved exactly from GitHub, so versions such as claude-opus-4.6, claude-opus-4.7, gpt-5.4, and gpt-5.5 remain separate.',
  },
  {
    term: 'App-owned teams',
    short: 'Teams maintained by this dashboard instead of GitHub teams.',
    details:
      'Because GitHub teams are not available here, config/teamAssignments.json maps GitHub logins to internal teams, display names, and roles.',
  },
  {
    term: 'Seats to reclaim',
    short: 'Licensed users with no meaningful Copilot activity.',
    details:
      'These users may need onboarding, a license check, or reassignment of the seat. Treat this as a conversation starter rather than an automatic removal list.',
  },
]

const railItems: Array<{ tab: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { tab: 'Overview', label: 'Overview', icon: LayoutDashboard },
  { tab: 'Users', label: 'Users', icon: Users },
  { tab: 'Teams', label: 'Teams', icon: Network },
  { tab: 'Models', label: 'Models', icon: Bot },
  { tab: 'Actions', label: 'Actions', icon: CheckCircle2 },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function App() {
  const [dashboard, setDashboard] = useState<DashboardResponse>({
    ...mockDashboardData,
    mode: 'mock',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [activeView, setActiveView] = useState('Executive adoption')
  const [team, setTeam] = useState('All teams')
  const [status, setStatus] = useState<AdoptionStatus | 'All statuses'>('All statuses')
  const [model, setModel] = useState('All models')
  const [editor, setEditor] = useState('All editors')
  const [query, setQuery] = useState('')
  const [selectedLogin, setSelectedLogin] = useState('')
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    let isMounted = true

    loadDashboardData().then((data) => {
      if (!isMounted) return
      setDashboard(data)
      setSelectedLogin(data.users[0]?.login ?? '')
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const modelOptions = useMemo(
    () => ['All models', ...dashboard.modelUsage.map((item) => item.model)],
    [dashboard.modelUsage],
  )

  const filteredUsers = useMemo(() => {
    return dashboard.users.filter((user) => {
      const teamMatch = team === 'All teams' || user.teams.includes(team)
      const statusMatch = status === 'All statuses' || user.status === status
      const modelMatch =
        model === 'All models' || user.model === model || user.modelBreakdown?.some((item) => item.model === model)
      const editorMatch = editor === 'All editors' || user.editor === editor
      const queryMatch =
        user.login.toLowerCase().includes(query.toLowerCase()) ||
        user.teams.join(' ').toLowerCase().includes(query.toLowerCase()) ||
        user.language.toLowerCase().includes(query.toLowerCase()) ||
        user.model.toLowerCase().includes(query.toLowerCase())

      return teamMatch && statusMatch && modelMatch && editorMatch && queryMatch
    })
  }, [dashboard.users, editor, model, query, status, team])

  const selectedUser =
    filteredUsers.find((user) => user.login === selectedLogin) ??
    filteredUsers[0] ??
    dashboard.users[0] ??
    mockDashboardData.users[0]

  const modelKeys = useMemo(() => {
    const keys = new Set<string>()
    dashboard.modelTrend.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== 'day') keys.add(key)
      })
    })
    return Array.from(keys).slice(0, 6)
  }, [dashboard.modelTrend])

  const metrics = useMemo(() => {
    const licensed = dashboard.users.length
    const active = filteredUsers.filter((user) => user.activeDays > 0).length
    const engaged = filteredUsers.filter((user) => user.acceptances > 25).length
    const chatUsers = filteredUsers.filter((user) => user.usedChat).length
    const agentUsers = filteredUsers.filter((user) => user.usedAgent).length
    const cliUsers = filteredUsers.filter((user) => user.usedCli).length
    const inactive = filteredUsers.filter((user) => user.status === 'Inactive').length

    return [
      { label: 'Licensed users', value: licensed, icon: Users, tone: 'blue' },
      { label: 'Active users', value: active, icon: Activity, tone: 'green' },
      { label: 'Engaged users', value: engaged, icon: CircleDot, tone: 'violet' },
      { label: 'Chat users', value: chatUsers, icon: Sparkles, tone: 'blue' },
      { label: 'Agent users', value: agentUsers, icon: Bot, tone: 'violet' },
      { label: 'CLI users', value: cliUsers, icon: Terminal, tone: 'gray' },
      { label: 'Inactive seats', value: inactive, icon: CheckCircle2, tone: 'red' },
    ]
  }, [dashboard.users.length, filteredUsers])

  const funnelData = useMemo(() => {
    const licensed = Number(metrics[0].value)
    const active = Number(metrics[1].value)
    const engaged = Number(metrics[2].value)
    const accepted = filteredUsers.filter((user) => user.acceptanceRate >= 20).length
    const agent = Number(metrics[4].value)

    return [
      { step: 'Licensed', users: licensed },
      { step: 'Active', users: active },
      { step: 'Engaged', users: engaged },
      { step: 'Accepted code', users: accepted },
      { step: 'Agent usage', users: agent },
    ]
  }, [filteredUsers, metrics])

  function applySavedView(view: SavedView) {
    setActiveView(view.name)
    setActiveTab(view.tab)
    setStatus(view.status)
    setModel(view.model)
    setEditor('All editors')
    setQuery('')
  }

  function clearFilters() {
    setTeam('All teams')
    setStatus('All statuses')
    setEditor('All editors')
    setModel('All models')
    setQuery('')
    setActiveView('')
  }

  function openUser(login: string) {
    setSelectedLogin(login)
    setIsUserModalOpen(true)
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <aside className="rail" aria-label="Primary navigation">
        <img
          className="rail-logo"
          src={theme === 'dark' ? '/nexent-logo-dark.png' : '/nexent-logo.png'}
          alt="Nexent Bank"
        />
        {railItems.map((item) => (
          <button
            aria-label={item.label}
            className={clsx('rail-button', activeTab === item.tab && 'active')}
            key={item.tab}
            title={item.label}
            type="button"
            onClick={() => setActiveTab(item.tab)}
          >
            <item.icon size={19} />
          </button>
        ))}
        <button
          aria-label="Help glossary"
          className={clsx('rail-button', isHelpOpen && 'active')}
          title="Help glossary"
          type="button"
          onClick={() => setIsHelpOpen(true)}
        >
          <HelpCircle size={19} />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">GitHub Copilot usage metrics</p>
            <h1>GitHub Copilot Usage Dashboard</h1>
            <div className={clsx('data-status', dashboard.mode)}>
              <span>{dashboard.mode === 'live' ? 'Live GitHub API' : 'Mock data'}</span>
              <small>
                {isLoading
                  ? 'Connecting...'
                  : dashboard.message ??
                    `${dashboard.reportRange?.start ?? 'Latest'} to ${dashboard.reportRange?.end ?? 'available report'}`}
              </small>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="searchbox">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users, teams, languages, models"
              />
            </label>
            <Select label="Range" value="Latest 28 days" options={['Latest 28 days']} />
            <button
              className="theme-toggle"
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <section className="filters" aria-label="Dashboard filters">
          <Select label="Team" value={team} options={dashboard.teams} onChange={setTeam} />
          <Select
            label="Segment"
            value={status}
            options={['All statuses', ...statusOrder]}
            onChange={(next) => setStatus(next as AdoptionStatus | 'All statuses')}
          />
          <Select
            label="IDE"
            value={editor}
            options={['All editors', ...dashboard.ideDistribution.map((item) => item.editor)]}
            onChange={setEditor}
          />
          <Select label="Model" value={model} options={modelOptions} onChange={setModel} />
          <button className="icon-button" type="button" aria-label="Clear filters" title="Clear filters" onClick={clearFilters}>
            <Filter size={18} />
          </button>
        </section>

        <section className="metric-grid">
          {metrics.map((metric) => (
            <div className={clsx('metric', metric.tone)} key={metric.label}>
              <metric.icon size={17} />
              <span>{metric.label}</span>
              <strong>{formatNumber(Number(metric.value))}</strong>
            </div>
          ))}
        </section>

        <nav className="tabbar" aria-label="Analytics tabs">
          {(['Overview', 'Users', 'Teams', 'Models', 'Actions'] satisfies Tab[]).map((tab) => (
            <button className={clsx(activeTab === tab && 'active')} key={tab} type="button" onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </nav>

        <div className="analysis-layout">
          <aside className="saved-views panel">
            <p className="section-kicker">Saved views</p>
            {savedViews.map((view) => (
              <button
                className={clsx('view-button', activeView === view.name && 'active')}
                type="button"
                key={view.name}
                onClick={() => applySavedView(view)}
              >
                <span>
                  <strong>{view.name}</strong>
                  <small>{view.description}</small>
                </span>
                <em>{view.scope}</em>
              </button>
            ))}

            <div className="cohort-stack">
              <p className="section-kicker">Cohorts</p>
              {statusOrder.map((item) => (
                <button
                  className={clsx('cohort-button', status === item && 'active')}
                  type="button"
                  key={item}
                  onClick={() => setStatus(status === item ? 'All statuses' : item)}
                >
                  <span style={{ background: statusColors[item] }} />
                  {item}
                </button>
              ))}
            </div>
          </aside>

          <section className="tab-content">
            {activeTab === 'Overview' && (
              <OverviewTab
                chatModes={dashboard.chatModes}
                cohortBuckets={dashboard.cohortBuckets}
                dailyActive={dashboard.dailyActive}
                funnelData={funnelData}
                ideDistribution={dashboard.ideDistribution}
                languageUsage={dashboard.languageUsage}
                modelKeys={modelKeys}
                modelTrend={dashboard.modelTrend}
              />
            )}
            {activeTab === 'Users' && (
              <UsersTab
                filteredUsers={filteredUsers}
                selectedUser={selectedUser}
                onSelect={openUser}
              />
            )}
            {activeTab === 'Teams' && <TeamsTab teams={dashboard.teamAnalytics} />}
            {activeTab === 'Models' && (
              <ModelsTab modelKeys={modelKeys} modelTrend={dashboard.modelTrend} modelUsage={dashboard.modelUsage} />
            )}
            {activeTab === 'Actions' && <ActionsTab insights={dashboard.insights} onSelect={openUser} />}
          </section>
        </div>
      </section>
      {isUserModalOpen && (
        <UserModal selectedUser={selectedUser} onClose={() => setIsUserModalOpen(false)} />
      )}
      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </main>
  )
}

function OverviewTab({
  chatModes,
  cohortBuckets,
  dailyActive,
  funnelData,
  ideDistribution,
  languageUsage,
  modelKeys,
  modelTrend,
}: {
  chatModes: DashboardResponse['chatModes']
  cohortBuckets: DashboardResponse['cohortBuckets']
  dailyActive: DashboardResponse['dailyActive']
  funnelData: Array<{ step: string; users: number }>
  ideDistribution: DashboardResponse['ideDistribution']
  languageUsage: DashboardResponse['languageUsage']
  modelKeys: string[]
  modelTrend: DashboardResponse['modelTrend']
}) {
  return (
    <div className="overview-grid">
      <section className="panel">
        <PanelHeader title="Adoption funnel" meta="Licensed to agent usage" />
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={funnelData} layout="vertical" margin={{ left: 24, right: 22 }}>
            <CartesianGrid stroke="#eef1f4" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="step" width={92} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="users" radius={[0, 6, 6, 0]} fill="#0969da" barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <PanelHeader title="Daily activity" meta="Active, chat, and agent users" />
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={dailyActive}>
            <CartesianGrid stroke="#eef1f4" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={34} />
            <Tooltip />
            <Area dataKey="active" stroke="#0969da" fill="#0969da22" strokeWidth={2} />
            <Area dataKey="chat" stroke="#1f883d" fill="#1f883d1f" strokeWidth={2} />
            <Area dataKey="agent" stroke="#8250df" fill="#8250df1f" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <PanelHeader title="Model trend" meta="Exact model IDs" />
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={modelTrend}>
            <CartesianGrid stroke="#eef1f4" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} hide />
            <YAxis tickLine={false} axisLine={false} width={34} />
            <Tooltip />
            {modelKeys.map((key, index) => (
              <Line key={key} dataKey={key} stroke={palette[index % palette.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <PanelHeader title="Feature usage" meta="Current report" />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chatModes.slice(0, 8)}>
            <CartesianGrid stroke="#eef1f4" vertical={false} />
            <XAxis dataKey="mode" tickLine={false} axisLine={false} hide />
            <YAxis tickLine={false} axisLine={false} width={42} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chatModes.map((entry, index) => (
                <Cell key={entry.mode} fill={palette[index % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <PanelHeader title="Active-day cohorts" meta="Users by activity depth" />
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={cohortBuckets}>
            <CartesianGrid stroke="#eef1f4" vertical={false} />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <Tooltip />
            <Bar dataKey="users" fill="#8250df" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <PanelHeader title="Editor distribution" meta="Latest plugin signal" />
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={ideDistribution} dataKey="users" nameKey="editor" innerRadius={48} outerRadius={78} paddingAngle={3}>
              {ideDistribution.map((entry, index) => (
                <Cell key={entry.editor} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </section>

      <section className="panel wide-panel">
        <PanelHeader title="Language usage" meta="Users, acceptance, LoC" />
        <LanguageList languageUsage={languageUsage} />
      </section>
    </div>
  )
}

function UsersTab({
  filteredUsers,
  selectedUser,
  onSelect,
}: {
  filteredUsers: CopilotUser[]
  selectedUser: CopilotUser
  onSelect: (login: string) => void
}) {
  return (
    <div className="detail-grid">
      <TeamUserMap users={filteredUsers} onSelect={onSelect} />
      <UserTable filteredUsers={filteredUsers} selectedUser={selectedUser} onSelect={onSelect} />
    </div>
  )
}

function TeamUserMap({ users, onSelect }: { users: CopilotUser[]; onSelect: (login: string) => void }) {
  const [teamSearch, setTeamSearch] = useState('')
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())

  const teams = useMemo(() => {
    const groups = new Map<string, CopilotUser[]>()
    const normalizedSearch = teamSearch.trim().toLowerCase()
    const matchingUsers = users.filter((user) => {
      if (!normalizedSearch) return true

      return (
        user.login.toLowerCase().includes(normalizedSearch) ||
        (user.displayName ?? '').toLowerCase().includes(normalizedSearch) ||
        user.teams.join(' ').toLowerCase().includes(normalizedSearch) ||
        (user.role ?? '').toLowerCase().includes(normalizedSearch)
      )
    })

    matchingUsers.forEach((user) => {
      user.teams.forEach((team) => groups.set(team, [...(groups.get(team) ?? []), user]))
    })
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [teamSearch, users])

  function toggleTeam(team: string) {
    setCollapsedTeams((current) => {
      const next = new Set(current)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }

  function collapseAll() {
    setCollapsedTeams(new Set(teams.map(([team]) => team)))
  }

  function expandAll() {
    setCollapsedTeams(new Set())
  }

  return (
    <section className="panel team-map-panel">
      <PanelHeader title="Team user representation" meta={`${teams.length} teams`} />
      <div className="team-map-toolbar">
        <label>
          <Search size={15} />
          <input
            value={teamSearch}
            onChange={(event) => setTeamSearch(event.target.value)}
            placeholder="Search users or teams"
          />
        </label>
        <button type="button" onClick={collapseAll}>Collapse</button>
        <button type="button" onClick={expandAll}>Expand</button>
      </div>
      <div className="team-map">
        {teams.length === 0 && <p className="empty-state">No team members match this search.</p>}
        {teams.map(([team, members]) => (
          <div className="team-node" key={team}>
            <header role="button" tabIndex={0} onClick={() => toggleTeam(team)} onKeyDown={(event) => event.key === 'Enter' && toggleTeam(team)}>
              <strong>{collapsedTeams.has(team) ? '+ ' : '- '}{team}</strong>
              <span>{members.length} users</span>
            </header>
            {!collapsedTeams.has(team) && (
              <div>
                {members.map((user) => (
                  <button key={`${team}-${user.login}`} type="button" onClick={() => onSelect(user.login)}>
                    <Avatar name={user.displayName ?? user.login} />
                    <span>
                      <strong>{user.displayName ?? user.login}</strong>
                      <small>{user.login} · {user.role ?? user.status}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function TeamsTab({ teams }: { teams: DashboardResponse['teamAnalytics'] }) {
  return (
    <div className="stack">
      <section className="panel">
        <PanelHeader title="Team performance" meta={`${teams.length} app-owned teams`} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Users</th>
                <th>Active</th>
                <th>Adoption</th>
                <th>Agent users</th>
                <th>Acceptance</th>
                <th>LoC added</th>
                <th>Primary model</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.team}>
                  <td>
                    <strong>{team.team}</strong>
                    <small>{formatNumber(team.prompts)} prompts</small>
                  </td>
                  <td>{team.users}</td>
                  <td>{team.activeUsers}</td>
                  <td>{team.adoptionRate}%</td>
                  <td>{team.agentUsers}</td>
                  <td>{team.acceptanceRate}%</td>
                  <td>{formatNumber(team.locAdded)}</td>
                  <td>{team.primaryModel}</td>
                  <td>{team.signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Team adoption comparison" meta="Active users and agent users" />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={teams}>
            <CartesianGrid stroke="#eef1f4" vertical={false} />
            <XAxis dataKey="team" tickLine={false} axisLine={false} hide />
            <YAxis tickLine={false} axisLine={false} width={34} />
            <Tooltip />
            <Bar dataKey="activeUsers" fill="#0969da" radius={[6, 6, 0, 0]} />
            <Bar dataKey="agentUsers" fill="#8250df" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}

function ModelsTab({
  modelKeys,
  modelTrend,
  modelUsage,
}: {
  modelKeys: string[]
  modelTrend: DashboardResponse['modelTrend']
  modelUsage: DashboardResponse['modelUsage']
}) {
  return (
    <div className="stack">
      <section className="panel">
        <PanelHeader title="Model trend" meta="Separate exact model IDs from GitHub" />
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={modelTrend}>
            <CartesianGrid stroke="#eef1f4" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={42} />
            <Tooltip />
            {modelKeys.map((key, index) => (
              <Line key={key} dataKey={key} stroke={palette[index % palette.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="panel">
        <PanelHeader title="Model performance" meta={`${modelUsage.length} models reported`} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Users</th>
                <th>Prompts</th>
                <th>Generations</th>
                <th>Acceptances</th>
                <th>Acceptance</th>
                <th>LoC</th>
              </tr>
            </thead>
            <tbody>
              {modelUsage.map((item) => (
                <tr key={item.model}>
                  <td><strong>{item.model}</strong></td>
                  <td>{item.users}</td>
                  <td>{formatNumber(item.prompts)}</td>
                  <td>{formatNumber(item.generations)}</td>
                  <td>{formatNumber(item.acceptances)}</td>
                  <td>{item.acceptanceRate}%</td>
                  <td>{formatNumber(item.loc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ActionsTab({
  insights,
  onSelect,
}: {
  insights: DashboardResponse['insights']
  onSelect: (login: string) => void
}) {
  return (
    <div className="insight-grid">
      <InsightList title="Users to coach" users={insights.usersToCoach} onSelect={onSelect} />
      <InsightList title="Agent opportunities" users={insights.agentOpportunities} onSelect={onSelect} />
      <InsightList title="Power users" users={insights.champions} onSelect={onSelect} />
      <InsightList title="Seats to reclaim" users={insights.seatsToReclaim} onSelect={onSelect} />
      <InsightList title="Stale IDE/plugin check" users={insights.staleIdeUsers} onSelect={onSelect} />
    </div>
  )
}

function InsightList({ title, users, onSelect }: { title: string; users: CopilotUser[]; onSelect: (login: string) => void }) {
  return (
    <section className="panel insight-card">
      <PanelHeader title={title} meta={`${users.length} users`} />
      <div className="action-list">
        {users.length === 0 && <p className="empty-state">No users in this queue.</p>}
        {users.map((user) => (
          <button type="button" key={`${title}-${user.login}`} onClick={() => onSelect(user.login)}>
            <span>
              <strong>{user.login}</strong>
              <small>{user.teams.join(', ')} · {user.recommendation}</small>
            </span>
            <em>{user.acceptanceRate}%</em>
          </button>
        ))}
      </div>
    </section>
  )
}

function UserModal({ selectedUser, onClose }: { selectedUser: CopilotUser; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="user-modal panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close user detail" onClick={onClose}>
          x
        </button>
        <UserDetail selectedUser={selectedUser} />
      </section>
    </div>
  )
}

function UserDetail({ selectedUser }: { selectedUser: CopilotUser }) {
  const featureBreakdown = selectedUser.featureBreakdown?.length
    ? selectedUser.featureBreakdown
    : [
        { feature: 'Prompts', value: selectedUser.prompts },
        { feature: 'Generations', value: selectedUser.generations },
        { feature: 'Acceptances', value: selectedUser.acceptances },
      ]

  return (
    <div className="user-detail">
      <header className="user-detail-header">
        <h2>
          {selectedUser.login}
          <span>({selectedUser.status})</span>
        </h2>
      </header>
      <div className="person-title">
        <strong>{selectedUser.displayName ?? selectedUser.login}</strong>
        <span>{selectedUser.role ?? 'GitHub Copilot user'}</span>
      </div>
      <div className="profile-line">
        <span style={{ background: statusColors[selectedUser.status] }} />
        {selectedUser.teams.join(' / ')}
      </div>
      <div className="drawer-metrics">
        <MiniStat label="Acceptance" value={`${selectedUser.acceptanceRate}%`} />
        <MiniStat label="Generations" value={formatNumber(selectedUser.generations)} />
        <MiniStat label="LoC net" value={formatNumber(selectedUser.locAdded - selectedUser.locDeleted)} />
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={featureBreakdown.slice(0, 6)}>
          <XAxis dataKey="feature" tickLine={false} axisLine={false} interval={0} fontSize={11} hide />
          <YAxis hide />
          <Tooltip />
          <Bar dataKey="value" fill="#0969da" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <dl className="detail-list">
        <div>
          <dt>Primary model</dt>
          <dd>{selectedUser.model}</dd>
        </div>
        <div>
          <dt>Model split</dt>
          <dd>
            {selectedUser.modelBreakdown?.slice(0, 3).map((item) => item.model).join(', ') || 'No model breakdown'}
            <InlineHelp term="Model split" />
          </dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{selectedUser.language}</dd>
        </div>
        <div>
          <dt>Last IDE version</dt>
          <dd>{selectedUser.ideVersion}</dd>
        </div>
        <div>
          <dt>Next action</dt>
          <dd>
            {selectedUser.recommendation}
            <InlineHelp term={selectedUser.recommendation} />
          </dd>
        </div>
      </dl>
    </div>
  )
}

function UserTable({
  filteredUsers,
  selectedUser,
  onSelect,
}: {
  filteredUsers: CopilotUser[]
  selectedUser: CopilotUser
  onSelect: (login: string) => void
}) {
  return (
    <section className="panel users-panel">
      <PanelHeader title="User analysis" meta={`${filteredUsers.length} visible users`} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Teams</th>
              <th>Active days</th>
              <th>Prompts</th>
              <th>Generations</th>
              <th>Acceptance</th>
              <th>Primary model</th>
              <th>Signals</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr className={clsx(user.login === selectedUser.login && 'selected')} key={user.login} onClick={() => onSelect(user.login)}>
                <td>
                  <strong>{user.login}</strong>
                  <small>{user.displayName ?? user.editor}</small>
                </td>
                <td>{user.teams.join(', ')}</td>
                <td>{user.activeDays}</td>
                <td>{formatNumber(user.prompts)}</td>
                <td>{formatNumber(user.generations)}</td>
                <td>{user.acceptanceRate}%</td>
                <td>{user.model}</td>
                <td>
                  <SignalPills user={user} />
                </td>
                <td>{user.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return <i className="avatar">{initials || '?'}</i>
}

function LanguageList({ languageUsage }: { languageUsage: DashboardResponse['languageUsage'] }) {
  const maxUsers = Math.max(...languageUsage.map((item) => item.users), 1)

  return (
    <div className="language-list">
      {languageUsage.map((item) => (
        <div className="language-row" key={item.language}>
          <span>{item.language}</span>
          <div>
            <b style={{ width: `${Math.max(6, (item.users / maxUsers) * 100)}%` }} />
          </div>
          <strong>{item.accept}%</strong>
          <em>{formatNumber(item.loc)} LoC</em>
        </div>
      ))}
    </div>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange?: (value: string) => void
}) {
  return (
    <label className="select-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={14} />
    </label>
  )
}

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  const topic = glossary.find((item) => item.term.toLowerCase() === title.toLowerCase())

  return (
    <header className="panel-header">
      <h2>
        {title}
        {topic && <HelpHint topic={topic} />}
      </h2>
      <span>{meta}</span>
    </header>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SignalPills({ user }: { user: CopilotUser }) {
  return (
    <div className="signal-pills">
      {user.usedChat && <span>Chat</span>}
      {user.usedAgent && <span>Agent</span>}
      {user.usedCli && <span>CLI</span>}
      {!user.usedChat && !user.usedAgent && !user.usedCli && <span>Setup</span>}
    </div>
  )
}

function InlineHelp({ term }: { term: string }) {
  const topic = glossary.find((item) => item.term.toLowerCase() === term.toLowerCase())
  if (!topic) return null

  return <HelpHint topic={topic} />
}

function HelpHint({ topic }: { topic: HelpTopic }) {
  return (
    <span className="help-hint" tabIndex={0} aria-label={`${topic.term}: ${topic.short}`}>
      ?
      <span role="tooltip">
        <strong>{topic.term}</strong>
        {topic.short}
      </span>
    </span>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="help-modal panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close help glossary" onClick={onClose}>
          x
        </button>
        <header className="help-header">
          <p className="eyebrow">Dashboard help</p>
          <h2>Glossary and reading guide</h2>
        </header>
        <div className="glossary-list">
          {glossary.map((topic) => (
            <article key={topic.term}>
              <h3>{topic.term}</h3>
              <p>{topic.short}</p>
              <span>{topic.details}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default App
