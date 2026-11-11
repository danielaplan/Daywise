import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Icon from './components/Icons'
import type { IconName } from './components/Icons'
import TaskEditor from './components/TaskEditor'
import {
  changeCompletion, createList, createTask, deleteList, deleteTask, loadWorkspace,
  moveToToday, readTask, renameList, saveTaskChanges,
} from './lib/daywiseApi'
import { neon } from './lib/neon'
import type { DaywiseList, DaywiseTask, Priority, TaskDraft } from './types/daywise'
import { dateInTimeZone, formatDate, sortTasks, timeGreeting } from './types/daywise'
import './App.css'

type Route = 'myday' | 'tasks' | 'planner' | 'vault' | 'habits' | 'focus' | 'insights' | 'settings'
type TaskScope = 'all' | 'inbox' | 'completed' | `list:${string}`

const navigation: { route: Route; label: string; icon: IconName; ready: boolean }[] = [
  { route: 'myday', label: 'My Day', icon: 'sun', ready: true },
  { route: 'tasks', label: 'Tasks', icon: 'check-square', ready: true },
  { route: 'planner', label: 'Planner', icon: 'calendar', ready: false },
  { route: 'vault', label: 'Vault', icon: 'folder', ready: false },
  { route: 'habits', label: 'Habits', icon: 'flame', ready: false },
  { route: 'focus', label: 'Focus', icon: 'timer', ready: false },
  { route: 'insights', label: 'Insights', icon: 'chart', ready: false },
]

function Badge({ children, kind = 'neutral' }: { children: ReactNode; kind?: string }) {
  return <span className={`badge badge-${kind}`}>{children}</span>
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge kind={priority}><span className={`priority-dot ${priority}`} />{priority[0].toUpperCase() + priority.slice(1)}</Badge>
}

function DateLabel({ date, today, danger }: { date: string | null; today: string; danger?: boolean }) {
  if (!date) return <span className="muted">—</span>
  const overdue = danger && date < today
  return <span className={overdue ? 'date-overdue' : date === today ? 'date-today' : ''}>{date === today ? 'Today' : formatDate(date)}</span>
}

function PageTitle({ eyebrow, title, caption, action }: { eyebrow: string; title: string; caption: string; action?: ReactNode }) {
  return (
    <div className="page-title-row">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{caption}</p></div>
      {action && <div className="title-action">{action}</div>}
    </div>
  )
}

function TaskCard({ task, listName, today, onOpen, onComplete, onMove, compact = false }: {
  task: DaywiseTask; listName: string; today: string; onOpen: (task: DaywiseTask) => void
  onComplete: (task: DaywiseTask) => void; onMove?: (task: DaywiseTask) => void; compact?: boolean
}) {
  return (
    <div className={`task-card task-card-${task.priority} ${compact ? 'task-card-compact' : ''}`}>
      <button className={`task-checkbox ${task.status === 'completed' ? 'is-checked' : ''}`}
        title={task.status === 'completed' ? 'Reopen task' : 'Mark task complete'}
        aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
        onClick={() => onComplete(task)}><Icon name="check" size={13} /></button>
      <button type="button" className="task-card-main" onClick={() => onOpen(task)}>
        <div className={`task-card-name ${task.status === 'completed' ? 'done-text' : ''}`}>{task.title}</div>
        <div className="task-card-meta">
          <PriorityBadge priority={task.priority} />
          {listName && <span><Icon name="folder" size={13} />{listName}</span>}
          {task.planned_date && <span><Icon name="calendar" size={13} />Planned {formatDate(task.planned_date)}</span>}
          {task.due_date && <span className={task.status === 'open' && task.due_date < today ? 'date-overdue' : ''}><Icon name="clock" size={13} />Due {task.due_date === today ? 'today' : formatDate(task.due_date)}</span>}
        </div>
        {!compact && task.description && <div className="task-card-desc">{task.description}</div>}
      </button>
      <div className="task-card-actions">
        {onMove && task.status === 'open' && task.planned_date !== today && (
          <button className="btn btn-small btn-secondary" type="button" onClick={() => onMove(task)}>Move to today</button>
        )}
        <button className="icon-button" type="button" title="Edit task" aria-label={`Edit ${task.title}`} onClick={() => onOpen(task)}><Icon name="chevron-right" /></button>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, subtitle, action }: { icon: IconName; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-symbol"><Icon name={icon} size={24} /></div><h3>{title}</h3><p>{subtitle}</p>{action}</div>
}

function MyDayPage({ tasks, lists, timezone, userName, onNew, onOpen, onComplete, onMove, onTasks }: {
  tasks: DaywiseTask[]; lists: DaywiseList[]; timezone: string; userName: string
  onNew: () => void; onOpen: (t: DaywiseTask) => void; onComplete: (t: DaywiseTask) => void
  onMove: (t: DaywiseTask) => void; onTasks: () => void
}) {
  const today = dateInTimeZone(timezone)
  const openTasks = tasks.filter(t => t.status === 'open')
  const todayOpen = sortTasks(openTasks.filter(t => t.planned_date === today))
  const overdue = sortTasks(openTasks.filter(t => t.due_date && t.due_date < today))
  const unfinished = sortTasks(openTasks.filter(t => t.planned_date && t.planned_date < today))
  const doneToday = tasks.filter(t => t.status === 'completed' && t.completed_at && dateInTimeZone(timezone, new Date(t.completed_at)) === today)
  const totalToday = todayOpen.length + doneToday.length
  const percent = totalToday ? Math.round((doneToday.length / totalToday) * 100) : 0
  const [showCompleted, setShowCompleted] = useState(false)
  const names = Object.fromEntries(lists.map(list => [list.id, list.name]))
  const firstName = userName.split(' ')[0] || 'there'
  const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: timezone }).format(new Date())

  return (
    <div className="page-stack">
      <PageTitle eyebrow="Personal daily plan" title={`${timeGreeting(timezone)}, ${firstName}`} caption={`${date} · Make space for what matters.`}
        action={<button className="btn btn-primary" onClick={onNew}><Icon name="plus" /> Add task</button>} />
      <div className="view-tabs"><span className="active"><Icon name="sun" size={16} /> Today</span><button onClick={onTasks}><Icon name="check-square" size={16} /> All tasks</button></div>
      <section className="progress-card">
        <div><span className="eyebrow">Today's progress</span><div className="progress-big">{percent}<small>%</small></div><div className="progress-note">{doneToday.length} completed · {todayOpen.length} remaining</div></div>
        <div className="progress-right"><div className="progress-track"><div style={{ width: `${percent}%` }} /></div><p>{totalToday === 0 ? 'Plan a task for today to begin.' : percent === 100 ? 'All planned tasks complete. Nice work.' : 'A little progress adds up.'}</p><div className="progress-stats"><span><strong>{doneToday.length}</strong> Done today</span><span><strong>{overdue.length}</strong> Overdue</span><span><strong>{unfinished.length}</strong> Unfinished plans</span></div></div>
      </section>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          {overdue.length > 0 && <section className="dashboard-section"><div className="section-heading"><div><Badge kind="high"><Icon name="alert" size={13} /> Overdue ({overdue.length})</Badge><span className="section-desc">Needs your attention</span></div><button className="text-link" onClick={onTasks}>View all <Icon name="chevron-right" size={14}/></button></div><div className="task-stack">{overdue.map(t => <TaskCard key={t.id} task={t} listName={names[t.list_id ?? ''] ?? ''} today={today} onOpen={onOpen} onComplete={onComplete} onMove={onMove} compact />)}</div></section>}
          <section className="dashboard-section"><div className="section-heading"><h2>Today's tasks <span className="count-bubble">{todayOpen.length}</span></h2><button className="btn btn-small btn-secondary" onClick={onNew}><Icon name="plus" size={15} /> Add task</button></div>
            {todayOpen.length ? <div className="task-stack">{todayOpen.map(t => <TaskCard key={t.id} task={t} listName={names[t.list_id ?? ''] ?? ''} today={today} onOpen={onOpen} onComplete={onComplete} />)}</div> : <EmptyState icon="sun" title="Nothing planned for today" subtitle="Add a task and set its planned date, or move an existing task to today." action={<button className="btn btn-secondary" onClick={onTasks}>Browse tasks <Icon name="arrow-right" size={16}/></button>} />}
          </section>
          <section className="dashboard-section"><div className="section-heading"><h2>Unfinished plans <span className="count-bubble">{unfinished.length}</span></h2></div>
            {unfinished.length ? <div className="task-stack">{unfinished.map(t => <TaskCard key={t.id} task={t} listName={names[t.list_id ?? ''] ?? ''} today={today} onOpen={onOpen} onComplete={onComplete} onMove={onMove} compact />)}</div> : <div className="subtle-card">No unfinished tasks carried over from earlier days.</div>}
          </section>
          <section className="dashboard-section"><button className="completed-toggle" onClick={() => setShowCompleted(!showCompleted)} aria-expanded={showCompleted}><span><Icon name="check-square" /> Completed today ({doneToday.length})</span><Icon name="chevron-down" className={showCompleted ? 'rotated' : ''}/></button>
            {showCompleted && (doneToday.length ? <div className="task-stack completed-stack">{doneToday.map(t => <TaskCard key={t.id} task={t} listName={names[t.list_id ?? ''] ?? ''} today={today} onOpen={onOpen} onComplete={onComplete} compact />)}</div> : <div className="subtle-card">No tasks completed today yet.</div>)}
          </section>
        </div>
        <aside className="dashboard-aside"><div className="focus-preview"><div className="focus-top"><span><Icon name="timer" size={16} /> Focus timer</span><span>Later milestone</span></div><h3>Deep focus</h3><p>Give one task your full attention.</p><div className="focus-clock">25:00</div><div className="focus-placeholder">Focus sessions coming soon</div></div><div className="aside-card"><div className="section-heading"><h3><Icon name="flame" size={18}/> Daily habits</h3><Badge>Coming soon</Badge></div><p>Habits and streak tracking will appear here when that module is built.</p></div><div className="aside-quote">“Small daily disciplines create extraordinary long-term momentum.”</div></aside>
      </div>
    </div>
  )
}

function TasksPage({ tasks, lists, timezone, scope, onScope, search, onSearch, onNew, onOpen, onComplete, onMove, onCreateList, onRenameList, onDeleteList }: {
  tasks: DaywiseTask[]; lists: DaywiseList[]; timezone: string; scope: TaskScope; onScope: (s: TaskScope) => void
  search: string; onSearch: (s: string) => void; onNew: () => void; onOpen: (t: DaywiseTask) => void
  onComplete: (t: DaywiseTask) => void; onMove: (t: DaywiseTask) => void
  onCreateList: () => void; onRenameList: (list: DaywiseList) => void; onDeleteList: (list: DaywiseList) => void
}) {
  const [priority, setPriority] = useState<'all' | Priority>('all')
  const [due, setDue] = useState<'any' | 'today' | 'overdue' | 'upcoming' | 'none'>('any')
  const today = dateInTimeZone(timezone)
  const names = Object.fromEntries(lists.map(list => [list.id, list.name]))
  const label = scope === 'all' ? 'All tasks' : scope === 'inbox' ? 'Inbox' : scope === 'completed' ? 'Completed' : (lists.find(l => `list:${l.id}` === scope)?.name ?? 'Task list')
  const filtered = sortTasks(tasks.filter(t => {
    if (scope === 'completed' ? t.status !== 'completed' : t.status !== 'open') return false
    if (scope === 'inbox' && t.list_id !== null) return false
    if (scope.startsWith('list:') && t.list_id !== scope.slice(5)) return false
    if (priority !== 'all' && t.priority !== priority) return false
    if (due === 'today' && t.due_date !== today) return false
    if (due === 'overdue' && !(t.due_date && t.due_date < today)) return false
    if (due === 'upcoming' && !(t.due_date && t.due_date > today)) return false
    if (due === 'none' && t.due_date !== null) return false
    const query = search.trim().toLocaleLowerCase()
    return !query || `${t.title} ${t.description ?? ''} ${names[t.list_id ?? ''] ?? ''}`.toLocaleLowerCase().includes(query)
  }))
  const activeCount = tasks.filter(t => t.status === 'open').length
  const overdueCount = tasks.filter(t => t.status === 'open' && t.due_date && t.due_date < today).length
  const selectedList = scope.startsWith('list:') ? lists.find(l => l.id === scope.slice(5)) : null

  return <div className="page-stack">
    <PageTitle eyebrow="Your task inventory" title={label} caption="A clear place for everything on your plate."
      action={<button className="btn btn-primary" onClick={onNew}><Icon name="plus" /> New task</button>} />
    <div className="task-pills">
      <button className={scope === 'all' ? 'selected' : ''} onClick={() => onScope('all')}>All tasks <span>{activeCount}</span></button>
      <button className={scope === 'inbox' ? 'selected' : ''} onClick={() => onScope('inbox')}>Inbox <span>{tasks.filter(t => t.status === 'open' && !t.list_id).length}</span></button>
      <button className={scope === 'completed' ? 'selected' : ''} onClick={() => onScope('completed')}>Completed <span>{tasks.filter(t => t.status === 'completed').length}</span></button>
      {lists.map(l => <button key={l.id} className={scope === `list:${l.id}` ? 'selected' : ''} onClick={() => onScope(`list:${l.id}`)}>{l.name}</button>)}
      <button className="pill-add" onClick={onCreateList} title="Create list" aria-label="Create list"><Icon name="plus" size={16}/></button>
    </div>
    {selectedList && <div className="list-actions"><span>Managing “{selectedList.name}”</span><button className="text-link" onClick={() => onRenameList(selectedList)}><Icon name="edit" size={14}/> Rename list</button><button className="text-link danger-link" onClick={() => onDeleteList(selectedList)}><Icon name="trash" size={14}/> Delete list</button></div>}
    <div className="toolbar"><label className="toolbar-search"><Icon name="search" size={18}/><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search tasks by title, description, or list" aria-label="Search tasks" /></label>
      <label className="toolbar-select"><Icon name="filter" size={17}/><select value={priority} onChange={e => setPriority(e.target.value as typeof priority)} aria-label="Filter priority"><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></label>
      <label className="toolbar-select"><Icon name="calendar" size={17}/><select value={due} onChange={e => setDue(e.target.value as typeof due)} aria-label="Filter due date"><option value="any">Any due date</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Upcoming</option><option value="none">No due date</option></select></label>
    </div>
    <div className="sort-hint"><Icon name="list" size={15}/> Sorted by priority (high to low), then due date</div>
    {filtered.length ? <section className="task-table"><div className="task-table-header"><span>Task details</span><span>List</span><span>Priority</span><span>Planned</span><span>Due date</span><span>Actions</span></div>
      {filtered.map(task => <div className={`task-table-row priority-line-${task.priority}`} key={task.id}>
        <div className="task-name-cell"><button className={`task-checkbox ${task.status === 'completed' ? 'is-checked' : ''}`} onClick={() => onComplete(task)} title={task.status === 'completed' ? 'Reopen' : 'Mark done'} aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}><Icon name="check" size={13}/></button><button className={`task-name-button ${task.status === 'completed' ? 'done-text' : ''}`} onClick={() => onOpen(task)}>{task.title}<small>{task.description || 'Click to view details'}</small></button></div>
        <div className="table-list-name"><Icon name="folder" size={14}/>{names[task.list_id ?? ''] ?? 'Inbox'}</div>
        <div><PriorityBadge priority={task.priority}/></div><div className="table-date"><DateLabel date={task.planned_date} today={today}/></div><div className="table-date"><DateLabel date={task.due_date} today={today} danger={task.status === 'open'}/></div>
        <div className="table-actions"><button className="icon-button" aria-label={`Edit ${task.title}`} title="Edit" onClick={() => onOpen(task)}><Icon name="edit" size={17}/></button>{task.status === 'open' && task.planned_date !== today && <button className="icon-button" aria-label={`Move ${task.title} to today`} title="Move to today" onClick={() => onMove(task)}><Icon name="calendar" size={17}/></button>}</div>
      </div>)}</section> : <EmptyState icon="inbox" title="No tasks found" subtitle="Try clearing your search or filters, or create a new task." action={<button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={16}/> Add a task</button>}/>}
    <div className="table-footer"><span>Showing {filtered.length} task{filtered.length === 1 ? '' : 's'} · {activeCount} open · {overdueCount} overdue</span><span>Owner-scoped data · Neon development</span></div>
  </div>
}

function Workspace({ name, userId, onSignOut, authBusy }: { name: string; userId: string; onSignOut: () => Promise<void>; authBusy: boolean }) {
  const [route, setRoute] = useState<Route>('myday')
  const [scope, setScope] = useState<TaskScope>('all')
  const [search, setSearch] = useState('')
  const [tasks, setTasks] = useState<DaywiseTask[]>([])
  const [lists, setLists] = useState<DaywiseList[]>([])
  const [timezone, setTimezone] = useState('UTC')
  const [hasSettings, setHasSettings] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<DaywiseTask | 'new' | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  const refresh = useCallback(async () => {
    const data = await loadWorkspace()
    setTasks(data.tasks)
    setLists(data.lists)
    setTimezone(data.timezone)
    setHasSettings(data.hasSettings)
  }, [])

  useEffect(() => {
    let active = true
    void loadWorkspace().then(data => {
      if (!active) return
      setTasks(data.tasks); setLists(data.lists)
      setTimezone(data.timezone); setHasSettings(data.hasSettings)
    }).catch(caught => { if (active) setError(caught instanceof Error ? caught.message : 'Failed to load Daywise') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId])

  async function mutate(action: () => Promise<void>, success: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      await action()
      await refresh()
      setNotice(success)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong.'
      setError(message)
      try { await refresh() } catch { /* keep original error */ }
    } finally { setBusy(false) }
  }

  function openTask(task: DaywiseTask) { setEditor(task) }
  function openNewTask() { setEditor('new') }
  async function saveEditor(draft: TaskDraft) {
    setBusy(true); setError('')
    try {
      if (editor === 'new') await createTask(draft)
      else if (editor) await saveTaskChanges(editor, draft)
      else throw new Error('No task selected')
      await refresh()
      setEditor(null)
      setNotice(editor === 'new' ? 'Task created successfully.' : 'Task changes saved.')
    } catch (caught) {
      // Important: title and detail mutations are separate calls. Reload workspace
      // to reflect a possible partial save, without replacing the local editor draft.
      try { await refresh() } catch { /* retain initial failure */ }
      throw caught
    } finally { setBusy(false) }
  }
  async function deleteEditorTask() {
    if (!editor || editor === 'new') return
    await deleteTask(editor)
    await refresh()
    setEditor(null)
    setNotice('Task permanently deleted.')
  }
  async function reloadEditorTask() {
    if (!editor || editor === 'new') return
    const updated = await readTask(editor.id)
    await refresh()
    if (!updated) { setEditor(null); throw new Error('This task is no longer available.') }
    setEditor(updated)
  }
  function moveTask(task: DaywiseTask) { void mutate(() => moveToToday(task), 'Task moved to today.') }
  function completeTask(task: DaywiseTask) { void mutate(() => changeCompletion(task), task.status === 'open' ? 'Task completed.' : 'Task reopened.') }
  function newList() {
    const input = window.prompt('New list name (up to 80 characters):')
    if (input === null) return
    if (!input.trim() || input.trim().length > 80) { setError('List name must be 1–80 characters.'); return }
    void mutate(async () => {
      const id = await createList(input)
      setScope(`list:${id}`); setRoute('tasks')
    }, 'List created.')
  }
  function editList(list: DaywiseList) {
    const input = window.prompt('Rename list:', list.name)
    if (input === null || input.trim() === list.name) return
    if (!input.trim() || input.trim().length > 80) { setError('List name must be 1–80 characters.'); return }
    void mutate(() => renameList(list, input), 'List renamed.')
  }
  function removeList(list: DaywiseList) {
    if (!window.confirm(`Delete “${list.name}”? Its tasks will be preserved and moved to Inbox.`)) return
    void mutate(async () => { await deleteList(list); setScope('all') }, 'List deleted. Tasks were preserved in Inbox.')
  }
  function navigate(target: Route) { setRoute(target); setMobileMenu(false) }
  const activeCount = useMemo(() => tasks.filter(t => t.status === 'open').length, [tasks])
  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: timezone }).format(new Date())

  const navContents = <>
    <div className="sidebar-brand"><div className="brand-mark"><Icon name="sun" size={23}/></div><div><strong>Daywise</strong><small>Your day. Your priorities.<br/>Your progress.</small></div></div>
    <div className="sidebar-scroll"><div className="nav-group-label">WORKSPACE</div><nav className="sidebar-nav" aria-label="Main navigation">{navigation.map(item => <button type="button" key={item.route} className={route === item.route ? 'active' : ''} onClick={() => navigate(item.route)}><Icon name={item.icon} size={19}/><span>{item.label}</span>{item.route === 'tasks' && <em>{activeCount}</em>}{!item.ready && <small className="nav-soon">Soon</small>}</button>)}</nav>
    <div className="sidebar-lists-header"><span>MY LISTS</span><button className="icon-button" title="Create task list" aria-label="Create task list" onClick={newList}><Icon name="plus" size={17}/></button></div>
    <nav className="sidebar-list-nav" aria-label="Task lists">{lists.map(list => <button key={list.id} className={scope === `list:${list.id}` && route === 'tasks' ? 'selected' : ''} onClick={() => { setScope(`list:${list.id}`); navigate('tasks') }}><span className="list-color-dot"/>{list.name}<small>{tasks.filter(t => t.list_id === list.id && t.status === 'open').length}</small></button>)}{lists.length === 0 && <p className="sidebar-empty">No lists yet</p>}</nav></div>
    <button className="sidebar-settings" onClick={() => navigate('settings')}><Icon name="settings" size={19}/> Settings</button>
  </>

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>{navContents}</aside>
    {mobileMenu && <button type="button" className="mobile-menu-shade" aria-label="Close navigation" onClick={() => setMobileMenu(false)}/>}
    <div className="app-right">
      <header className="topbar"><button className="icon-button mobile-menu-button" title="Open navigation" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Icon name="menu"/></button><div className="topbar-date"><Icon name="calendar" size={17}/>{dateLabel}</div><div className="topbar-right"><span className="workspace-chip"><Icon name="shield" size={14}/> Private workspace</span><button className="btn btn-primary topbar-add" onClick={openNewTask}><Icon name="plus" size={16}/> Add task</button><div className="avatar" title={name}>{name.trim()[0]?.toUpperCase() ?? 'U'}</div><button className="icon-button signout-button" onClick={() => void onSignOut()} disabled={authBusy} title="Sign out" aria-label="Sign out"><Icon name="log-out" size={19}/></button></div></header>
      <main className="main-view" aria-busy={loading || busy}>
        {(notice || error) && <div className={`notice-banner ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}><Icon name={error ? 'alert' : 'check'} size={17}/><span>{error || notice}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => { setError(''); setNotice('') }}><Icon name="x" size={16}/></button></div>}
        {!hasSettings && <div className="notice-banner notice-warning"><Icon name="alert" size={17}/><span>User settings not initialized. Dates use UTC until settings are configured.</span></div>}
        {loading ? <div className="loading-state"><div className="loading-spinner"/> Loading your private workspace...</div> : route === 'myday' ?
          <MyDayPage tasks={tasks} lists={lists} timezone={timezone} userName={name} onNew={openNewTask} onOpen={openTask} onComplete={completeTask} onMove={moveTask} onTasks={() => navigate('tasks')}/> : route === 'tasks' ?
          <TasksPage tasks={tasks} lists={lists} timezone={timezone} scope={scope} onScope={setScope} search={search} onSearch={setSearch} onNew={openNewTask} onOpen={openTask} onComplete={completeTask} onMove={moveTask} onCreateList={newList} onRenameList={editList} onDeleteList={removeList}/> :
          <div className="coming-page"><PageTitle eyebrow="Daywise workspace" title={route[0].toUpperCase() + route.slice(1)} caption="This module is part of the planned Daywise MVP."/><EmptyState icon={route === 'settings' ? 'settings' : 'sparkle'} title="Coming in a future milestone" subtitle="My Day and Tasks are connected to Neon now. We'll build this module next, without using demo data." action={<button className="btn btn-secondary" onClick={() => navigate('myday')}><Icon name="arrow-right" size={16}/> Back to My Day</button>}/></div>}
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{navigation.slice(0, 4).map(item => <button key={item.route} className={route === item.route ? 'active' : ''} onClick={() => navigate(item.route)}><Icon name={item.icon} size={21}/><span>{item.label}</span></button>)}<button onClick={openNewTask}><span className="bottom-add"><Icon name="plus" size={21}/></span><span>Add</span></button></nav>
    {editor !== null && <TaskEditor key={editor === 'new' ? 'new' : `${editor.id}:${editor.version}`} task={editor === 'new' ? null : editor} lists={lists} onClose={() => setEditor(null)} onSave={saveEditor} onDelete={deleteEditorTask} onReload={reloadEditorTask} />}
  </div>
}

function App() {
  const { data: session, isPending, error: sessionError } = neon.auth.useSession()
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  async function signIn() {
    setAuthBusy(true); setAuthError('')
    try {
      const result = await neon.auth.signIn.social({ provider: 'google', callbackURL: window.location.origin })
      if (result.error) throw new Error(result.error.message)
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : 'Unable to sign in.')
    } finally { setAuthBusy(false) }
  }
  async function signOut() {
    setAuthBusy(true); setAuthError('')
    try {
      const result = await neon.auth.signOut()
      if (result.error) throw new Error(result.error.message)
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : 'Unable to sign out.')
    } finally { setAuthBusy(false) }
  }

  if (isPending) return <div className="auth-screen"><div className="auth-card"><div className="auth-mark"><Icon name="sun" size={29}/></div><h1>Daywise</h1><p>Checking your session...</p></div></div>
  if (!session?.user) return <div className="auth-screen"><div className="auth-card"><div className="auth-mark"><Icon name="sun" size={29}/></div><h1>Welcome to Daywise</h1><p>Your day. Your priorities. Your progress.</p><button className="btn btn-primary auth-btn" onClick={() => void signIn()} disabled={authBusy}>{authBusy ? 'Please wait...' : 'Continue with Google'} <Icon name="arrow-right" size={18}/></button>{(authError || sessionError) && <div className="inline-error" role="alert">{authError || 'Authentication session error.'}</div>}<small>One private workspace for your tasks and daily plans.</small></div></div>
  return <Workspace key={session.user.id} userId={session.user.id} name={session.user.name || 'You'} onSignOut={signOut} authBusy={authBusy}/>
}

export default App
