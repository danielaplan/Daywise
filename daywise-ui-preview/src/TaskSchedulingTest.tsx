import { useState } from 'react'
import { neon } from './lib/neon'

type Task = {
  id: string
  title: string
  status: 'open' | 'completed'
  planned_date: string | null
  due_date: string | null
  version: number
}

function localDate(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

export default function TaskSchedulingTest() {
  const [taskId, setTaskId] = useState('')
  const [expectedVersion, setExpectedVersion] = useState('')
  const [task, setTask] = useState<Task | null>(null)
  const [timezone, setTimezone] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function fetchTask(id: string): Promise<Task | null> {
    const { data, error } = await neon
      .from('tasks')
      .select('id,title,status,planned_date,due_date,version')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as Task | null) ?? null
  }

  async function loadSettings() {
    const { data, error } = await neon
      .from('user_settings')
      .select('timezone')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Initialize user settings first.')

    setTimezone(data.timezone)
    return data.timezone as string
  }

  async function createTestTask() {
    setBusy(true)
    setMessage('')

    try {
      await loadSettings()

      const { data, error } = await neon.rpc('create_task', {
        p_title: 'Move to Today security test',
        p_priority: 'low',
        p_due_date: '2030-12-31',
      })

      if (error) throw new Error(error.message)
      if (typeof data !== 'string') {
        throw new Error('Unexpected task ID.')
      }

      const saved = await fetchTask(data)

      if (!saved) throw new Error('Created task not accessible.')

      setTaskId(data)
      setTask(saved)
      setExpectedVersion(String(saved.version))
      setMessage('Test task created successfully.')
    } catch (error) {
      setMessage(
        'ERROR: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function loadTask() {
    setBusy(true)
    setMessage('')

    try {
      await loadSettings()

      const saved = await fetchTask(taskId.trim())
      setTask(saved)

      if (!saved) {
        setMessage('No accessible task found.')
        return
      }

      setExpectedVersion(String(saved.version))
      setMessage(`Loaded version ${saved.version}.`)
    } catch (error) {
      setMessage(
        'ERROR: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function moveToToday() {
    const version = Number(expectedVersion)

    if (
      !taskId.trim() ||
      !Number.isSafeInteger(version) ||
      version < 1
    ) {
      setMessage('Enter a valid task UUID and version.')
      return
    }

    setBusy(true)
    setMessage('')

    try {
      const tz = await loadSettings()
      const before = await fetchTask(taskId.trim())

      const { data, error } = await neon.rpc('move_task_to_today', {
        p_task_id: taskId.trim(),
        p_expected_version: version,
      })

      if (error) {
        setMessage(`REJECTED: ${error.message}`)
        return
      }

      if (!before) {
        setMessage(
          'SECURITY FAILURE: Operation succeeded on an inaccessible task.',
        )
        return
      }

      const after = await fetchTask(taskId.trim())

      if (!after) {
        setMessage('ERROR: Cannot read saved task.')
        return
      }

      setTask(after)

      const passed =
        after.planned_date === localDate(tz) &&
        after.due_date === before.due_date &&
        after.status === before.status &&
        after.version === before.version + 1 &&
        Number(data) === after.version

      setMessage(
        passed
          ? `PASS: Moved to today. Saved version ${after.version}. Due date unchanged.`
          : 'CHECK FAILED: Saved values did not match expectations.',
      )
    } catch (error) {
      setMessage(
        'ERROR: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Daywise — Move to Today Test</h2>

      <button onClick={createTestTask} disabled={busy}>
        Create Disposable Test Task
      </button>

      <p>Saved Timezone: {timezone || 'Not loaded'}</p>

      <div>
        <label>
          Real Task UUID
          <input
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            placeholder="Task UUID"
          />
        </label>

        <button onClick={loadTask} disabled={busy}>
          Load Task
        </button>
      </div>

      <div>
        <label>
          Expected Version
          <input
            type="number"
            min="1"
            value={expectedVersion}
            onChange={(event) => setExpectedVersion(event.target.value)}
          />
        </label>
      </div>

      {task && (
        <div style={{ marginTop: 16 }}>
          <h3>Saved Task</h3>
          <p>Title: {task.title}</p>
          <p>Status: {task.status}</p>
          <p>Planned Date: {task.planned_date ?? 'NULL'}</p>
          <p>Due Date: {task.due_date ?? 'NULL'}</p>
          <p>Saved Version: {task.version}</p>
        </div>
      )}

      <button onClick={moveToToday} disabled={busy}>
        {busy ? 'Processing...' : 'Move to Today'}
      </button>

      <p role="status">{message}</p>
    </section>
  )
}
