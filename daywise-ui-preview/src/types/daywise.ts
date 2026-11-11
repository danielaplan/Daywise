export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'open' | 'completed'

export type DaywiseTask = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  planned_date: string | null
  due_date: string | null
  list_id: string | null
  completed_at: string | null
  version: number
  created_at: string
  updated_at: string
}

export type DaywiseList = {
  id: string
  name: string
  version: number
}

export type TaskDraft = {
  title: string
  description: string
  priority: Priority
  planned_date: string
  due_date: string
  list_id: string
}

export function taskToDraft(task?: DaywiseTask | null): TaskDraft {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    planned_date: task?.planned_date ?? '',
    due_date: task?.due_date ?? '',
    list_id: task?.list_id ?? '',
  }
}

export function priorityOrder(priority: Priority): number {
  return { high: 0, medium: 1, low: 2 }[priority]
}

export function sortTasks(tasks: DaywiseTask[]): DaywiseTask[] {
  return [...tasks].sort((a, b) => {
    const priorityDifference = priorityOrder(a.priority) - priorityOrder(b.priority)
    if (priorityDifference !== 0) return priorityDifference
    const ad = a.due_date ?? '9999-12-31'
    const bd = b.due_date ?? '9999-12-31'
    if (ad !== bd) return ad.localeCompare(bd)
    return a.created_at.localeCompare(b.created_at)
  })
}

export function dateInTimeZone(timezone: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function formatDate(date: string | null): string {
  if (!date) return 'Not set'
  // Interpret date-only fields as calendar dates, not as instants.
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  const stable = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(stable)
}

export function timeGreeting(timezone: string): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()))
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function isVersionConflict(message: string): boolean {
  return /changed or unavailable|editing conflict|stale|version/i.test(message)
}
