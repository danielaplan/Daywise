import { neon } from './neon'
import type { DaywiseList, DaywiseTask, TaskDraft } from '../types/daywise'

const taskColumns = 'id,title,description,status,priority,planned_date,due_date,list_id,completed_at,version,created_at,updated_at'

function throwIfError(error: { message: string } | null | undefined): void {
  if (error) throw new Error(error.message)
}

export async function loadWorkspace() {
  const [tasksResult, listsResult, settingsResult] = await Promise.all([
    neon.from('tasks').select(taskColumns),
    neon.from('task_lists').select('id,name,version'),
    neon.from('user_settings').select('timezone,week_starts_on').maybeSingle(),
  ])
  throwIfError(tasksResult.error)
  throwIfError(listsResult.error)
  throwIfError(settingsResult.error)
  return {
    tasks: (tasksResult.data ?? []) as DaywiseTask[],
    lists: (listsResult.data ?? []) as DaywiseList[],
    timezone: (settingsResult.data as { timezone: string } | null)?.timezone ?? 'UTC',
    hasSettings: Boolean(settingsResult.data),
  }
}

export async function readTask(id: string): Promise<DaywiseTask | null> {
  const { data, error } = await neon.from('tasks').select(taskColumns).eq('id', id).maybeSingle()
  throwIfError(error)
  return (data as DaywiseTask | null) ?? null
}

export async function createTask(draft: TaskDraft): Promise<string> {
  const { data, error } = await neon.rpc('create_task', {
    p_title: draft.title.trim(),
    p_description: draft.description || null,
    p_priority: draft.priority,
    p_planned_date: draft.planned_date || null,
    p_due_date: draft.due_date || null,
    p_list_id: draft.list_id || null,
  })
  throwIfError(error)
  if (typeof data !== 'string') throw new Error('Unexpected task ID from database')
  return data
}

export async function saveTaskChanges(original: DaywiseTask, draft: TaskDraft): Promise<void> {
  let version = original.version
  let titleSaved = false
  const trimmedTitle = draft.title.trim()

  // Migrations 0003 and 0009 expose two separate mutations. If both fields
  // change, save title first and clearly report a PARTIAL save if details fail.
  if (trimmedTitle !== original.title) {
    const result = await neon.rpc('update_task_title', {
      p_task_id: original.id,
      p_expected_version: version,
      p_new_title: trimmedTitle,
    })
    throwIfError(result.error)
    version = Number(result.data)
    titleSaved = true
  }

  const detailsChanged =
    draft.description !== (original.description ?? '') ||
    draft.priority !== original.priority ||
    draft.planned_date !== (original.planned_date ?? '') ||
    draft.due_date !== (original.due_date ?? '') ||
    draft.list_id !== (original.list_id ?? '')

  if (!detailsChanged) return
  const result = await neon.rpc('update_task_details', {
    p_task_id: original.id,
    p_expected_version: version,
    p_description: draft.description || null,
    p_priority: draft.priority,
    p_planned_date: draft.planned_date || null,
    p_due_date: draft.due_date || null,
    p_list_id: draft.list_id || null,
  })
  if (result.error) {
    const prefix = titleSaved
      ? 'Your title was saved, but the other changes were not. Reload the latest task before trying again. '
      : ''
    throw new Error(prefix + result.error.message)
  }
}

export async function changeCompletion(task: DaywiseTask): Promise<void> {
  const functionName = task.status === 'open' ? 'complete_task' : 'reopen_task'
  const { error } = await neon.rpc(functionName, {
    p_task_id: task.id,
    p_expected_version: task.version,
  })
  throwIfError(error)
}

export async function moveToToday(task: DaywiseTask): Promise<void> {
  const { error } = await neon.rpc('move_task_to_today', {
    p_task_id: task.id,
    p_expected_version: task.version,
  })
  throwIfError(error)
}

export async function deleteTask(task: DaywiseTask): Promise<void> {
  const { error, data } = await neon.rpc('delete_task', {
    p_task_id: task.id,
    p_expected_version: task.version,
  })
  throwIfError(error)
  if (data !== task.id) throw new Error('Database returned an unexpected task identifier')
}

export async function createList(name: string): Promise<string> {
  const { error, data } = await neon.rpc('create_task_list', { p_name: name.trim() })
  throwIfError(error)
  if (typeof data !== 'string') throw new Error('Unexpected list ID from database')
  return data
}

export async function renameList(list: DaywiseList, newName: string): Promise<void> {
  const { error } = await neon.rpc('rename_task_list', {
    p_list_id: list.id, p_expected_version: list.version, p_new_name: newName.trim(),
  })
  throwIfError(error)
}

export async function deleteList(list: DaywiseList): Promise<void> {
  const { error } = await neon.rpc('delete_task_list', {
    p_list_id: list.id, p_expected_version: list.version,
  })
  throwIfError(error)
}
