import { useState } from 'react'
import { neon } from './lib/neon'

type Task = {
  id: string
  title: string
  version: number
  status: string
}

export default function TaskDeletionTest() {
  const [taskId, setTaskId] = useState('')
  const [version, setVersion] = useState('1')
  const [task, setTask] = useState<Task | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function readTask(id: string) {
    const { data, error } = await neon
      .from('tasks')
      .select('id,title,version,status')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as Task | null
  }

  async function createDisposableTask() {
    setBusy(true)
    setMessage('')

    try {
      const { data, error } = await neon.rpc('create_task', {
        p_title: 'Disposable deletion test',
        p_priority: 'low',
      })

      if (error) throw new Error(error.message)
      if (typeof data !== 'string') {
        throw new Error('Unexpected task ID.')
      }

      const saved = await readTask(data)
      if (!saved) throw new Error('Cannot read created task.')

      setTaskId(saved.id)
      setVersion(String(saved.version))
      setTask(saved)
      setMessage('Disposable task created.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Creation failed',
      )
    } finally {
      setBusy(false)
    }
  }

  async function loadTask() {
    setBusy(true)

    try {
      const saved = await readTask(taskId.trim())
      setTask(saved)

      if (!saved) {
        setMessage('No accessible task found.')
        return
      }

      setVersion(String(saved.version))
      setMessage(`Loaded task version ${saved.version}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }

  async function prepareStaleTest() {
    setBusy(true)

    try {
      const { data, error } = await neon.rpc('update_task_title', {
        p_task_id: taskId.trim(),
        p_expected_version: Number(version),
        p_new_title: 'Disposable task — revised',
      })

      if (error) throw new Error(error.message)

      const latest = await readTask(taskId.trim())
      setTask(latest)

      setMessage(
        `Task is now version ${data}. ` +
          `Expected Version remains ${version}. ` +
          'A deletion using the old version must fail.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteTask() {
    const id = taskId.trim()
    const expectedVersion = Number(version)

    if (
      !id ||
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 1
    ) {
      setMessage('Enter a valid task ID and version.')
      return
    }

    if (
      !window.confirm(
        'Permanently delete this test task? This cannot be undone.',
      )
    ) {
      setMessage('CANCELED: No deletion request was sent.')
      return
    }

    setBusy(true)
    setMessage('')

    try {
      const { data, error } = await neon.rpc('delete_task', {
        p_task_id: id,
        p_expected_version: expectedVersion,
      })

      if (error) {
        setMessage(`REJECTED: ${error.message}`)
        return
      }

      if (data !== id) {
        setMessage('CHECK FAILED: Unexpected deleted task ID.')
        return
      }

      const after = await readTask(id)

      if (after !== null) {
        setMessage('CHECK FAILED: Task is still accessible.')
        return
      }

      setTask(null)
      setMessage('PASS: Task deleted and no longer accessible.')
    } catch (error) {
      setMessage(
        'ERROR: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function testDirectDelete() {
    setBusy(true)

    try {
      const { error } = await neon
        .from('tasks')
        .delete()
        .eq('id', taskId.trim())

      if (!error) {
        setMessage('UNEXPECTED RESPONSE: Verify the task and permissions.')
        return
      }

      setMessage(`Direct DELETE rejected: ${error.message}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Daywise — Task Deletion Test</h2>
      <p>Use disposable test tasks only; deletion cannot be undone.</p>

      <button onClick={createDisposableTask} disabled={busy}>
        Create Disposable Task
      </button>

      <div style={{ marginTop: 16 }}>
        <label>
          Task UUID
          <input
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
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
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          />
        </label>
      </div>

      {task && (
        <div>
          <p>Title: {task.title}</p>
          <p>Status: {task.status}</p>
          <p>Saved Version: {task.version}</p>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={prepareStaleTest} disabled={busy}>
          Prepare Stale Version
        </button>

        <button onClick={deleteTask} disabled={busy}>
          Delete With Confirmation
        </button>

        <button onClick={testDirectDelete} disabled={busy}>
          Test Direct DELETE
        </button>
      </div>

      <p role="status">{message}</p>
    </section>
  )
}
