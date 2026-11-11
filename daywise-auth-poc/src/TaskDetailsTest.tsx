import { useState } from 'react'
import { neon } from './lib/neon'

type Task = {
  id: string
  title: string
  description: string | null
  priority: string
  planned_date: string | null
  due_date: string | null
  list_id: string | null
  status: string
  completed_at: string | null
  version: number
}

export default function TaskDetailsTest() {
  const [taskId, setTaskId] = useState('')
  const [expectedVersion, setExpectedVersion] = useState('1')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [plannedDate, setPlannedDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [listId, setListId] = useState('')
  const [task, setTask] = useState<Task | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage('')

    try {
      await action()
    } catch (error) {
      setMessage(
        'ERROR: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function readTask(id: string): Promise<Task | null> {
    const { data, error } = await neon
      .from('tasks')
      .select(
        'id,title,description,priority,planned_date,' +
          'due_date,list_id,status,completed_at,version',
      )
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as Task | null
  }

  async function loadIntoForm(id: string) {
    const saved = await readTask(id)
    setTask(saved)

    if (saved) {
      setTaskId(saved.id)
      setExpectedVersion(String(saved.version))
      setDescription(saved.description ?? '')
      setPriority(saved.priority)
      setPlannedDate(saved.planned_date ?? '')
      setDueDate(saved.due_date ?? '')
      setListId(saved.list_id ?? '')
    }

    return saved
  }

  async function createDisposableTask() {
    await run(async () => {
      const { data, error } = await neon.rpc('create_task', {
        p_title: 'QA full task editing',
        p_priority: 'medium',
        p_due_date: '2030-12-31',
      })

      if (error) throw new Error(error.message)
      if (typeof data !== 'string') {
        throw new Error('Unexpected task UUID.')
      }

      const saved = await loadIntoForm(data)

      if (!saved) {
        throw new Error('Created task was not readable.')
      }

      setMessage(
        `PASS: Disposable task created. Version ${saved.version}.`,
      )
    })
  }

  async function createOwnedTestList() {
    await run(async () => {
      const name = 'QA Details ' + crypto.randomUUID().slice(0, 8)

      const { data, error } = await neon.rpc('create_task_list', {
        p_name: name,
      })

      if (error) throw new Error(error.message)
      if (typeof data !== 'string') {
        throw new Error('Unexpected list UUID.')
      }

      const { data: saved, error: readError } = await neon
        .from('task_lists')
        .select('id,name')
        .eq('id', data)
        .maybeSingle()

      if (readError) throw new Error(readError.message)
      if (!saved) throw new Error('Created list not readable.')

      setListId(data)
      setMessage(`PASS: Created owned list "${saved.name}". UUID: ${data}`)
    })
  }

  async function loadTask() {
    await run(async () => {
      const saved = await loadIntoForm(taskId.trim())

      setMessage(
        saved
          ? `Loaded latest task. Version ${saved.version}.`
          : 'No accessible task found.',
      )
    })
  }

  async function saveDetails() {
    await run(async () => {
      const id = taskId.trim()
      const version = Number(expectedVersion)

      if (!id || !Number.isSafeInteger(version) || version < 1) {
        throw new Error('Enter a valid task UUID and version.')
      }

      const before = await readTask(id)
      const requested = {
        p_task_id: id,
        p_expected_version: version,
        p_description: description === '' ? null : description,
        p_priority: priority,
        p_planned_date: plannedDate || null,
        p_due_date: dueDate || null,
        p_list_id: listId.trim() || null,
      }

      const { data, error } = await neon.rpc(
        'update_task_details',
        requested,
      )

      if (error) {
        const afterRejection = await readTask(id)

        if (
          before &&
          JSON.stringify(before) !== JSON.stringify(afterRejection)
        ) {
          setMessage(
            'CHECK FAILED: A rejected request appears to have changed the task.',
          )
          return
        }

        setTask(afterRejection)
        setMessage(`REJECTED: ${error.message}`)
        return
      }

      const after = await readTask(id)
      setTask(after)

      if (!before || !after) {
        setMessage(
          'SECURITY FAILURE: Update succeeded on a task that was not accessible.',
        )
        return
      }

      const passed =
        before.version === version &&
        Number(data) === after.version &&
        after.version === before.version + 1 &&
        after.description === requested.p_description &&
        after.priority === requested.p_priority &&
        after.planned_date === requested.p_planned_date &&
        after.due_date === requested.p_due_date &&
        after.list_id === requested.p_list_id &&
        after.title === before.title &&
        after.status === before.status &&
        after.completed_at === before.completed_at

      setMessage(
        passed
          ? `PASS: Details saved. Version ${after.version}. Title and status unchanged.`
          : 'CHECK FAILED: Saved values do not match the requested changes.',
      )
    })
  }

  async function testDirectUpdate() {
    await run(async () => {
      const id = taskId.trim()
      const before = await readTask(id)

      if (!before) {
        throw new Error('Load an owned task first.')
      }

      const changedPriority = before.priority === 'high' ? 'low' : 'high'

      const { data, error } = await neon
        .from('tasks')
        .update({ priority: changedPriority })
        .eq('id', id)
        .select('id')

      const after = await readTask(id)
      setTask(after)
      const unchanged = JSON.stringify(before) === JSON.stringify(after)

      if (unchanged && (error || !data || data.length === 0)) {
        setMessage(
          'PASS: Direct UPDATE rejected or filtered by RLS; task unchanged.',
        )
      } else {
        setMessage(
          'CHECK FAILED: Direct UPDATE was not safely rejected. Review database permissions.',
        )
      }
    })
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Daywise — Full Task Editing Test</h2>

      <button disabled={busy} onClick={createDisposableTask}>
        Create Disposable Task
      </button>

      <div style={{ marginTop: 16 }}>
        <label>
          Task UUID
          <input
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            placeholder="Task UUID"
          />
        </label>
        <button disabled={busy} onClick={loadTask}>
          Load Latest Task
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

      <div style={{ marginTop: 16 }}>
        <label>
          Description
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      <div>
        <label>
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="invalid">Invalid Priority (Security Test)</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Planned Date
          <input
            type="date"
            value={plannedDate}
            onChange={(event) => setPlannedDate(event.target.value)}
          />
        </label>
      </div>

      <div>
        <label>
          Due Date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
      </div>

      <div>
        <label>
          Task List UUID
          <input
            value={listId}
            onChange={(event) => setListId(event.target.value)}
            placeholder="Blank means unassigned"
          />
        </label>
        <button disabled={busy} onClick={createOwnedTestList}>
          Create Owned Test List
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <button disabled={busy} onClick={saveDetails}>
          Save Task Details
        </button>

        <button
          disabled={busy}
          onClick={() => setDescription('x'.repeat(5001))}
        >
          Fill 5,001-Character Description
        </button>

        <button disabled={busy} onClick={testDirectUpdate}>
          Test Direct UPDATE
        </button>
      </div>

      {task && (
        <div style={{ marginTop: 20 }}>
          <h3>Latest Saved Database Values</h3>
          <p>Title: {task.title}</p>
          <p>Description: {task.description ?? 'NULL'}</p>
          <p>Priority: {task.priority}</p>
          <p>Planned Date: {task.planned_date ?? 'NULL'}</p>
          <p>Due Date: {task.due_date ?? 'NULL'}</p>
          <p>List ID: {task.list_id ?? 'NULL'}</p>
          <p>Status: {task.status}</p>
          <p>Completed At: {task.completed_at ?? 'NULL'}</p>
          <p>Saved Version: {task.version}</p>
        </div>
      )}

      <p role="status">{message}</p>
    </section>
  )
}
