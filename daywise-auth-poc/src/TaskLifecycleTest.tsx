import { useState } from 'react'
import { neon } from './lib/neon'

type Task = {
  id: string
  title: string
  status: 'open' | 'completed'
  version: number
  completed_at: string | null
}

export default function TaskLifecycleTest() {
  const [taskId, setTaskId] = useState('')
  const [expectedVersion, setExpectedVersion] = useState('')
  const [task, setTask] = useState<Task | null>(null)
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadTask() {
    setBusy(true)
    setResult('')
    setTask(null)

    try {
      const { data, error } = await neon
        .from('tasks')
        .select('id, title, status, version, completed_at')
        .eq('id', taskId.trim())
        .maybeSingle()

      if (error) throw new Error(error.message)

      if (!data) {
        setResult('No accessible task found.')
        return
      }

      const loaded = data as Task
      setTask(loaded)
      setExpectedVersion(String(loaded.version))
      setResult(`Loaded version ${loaded.version}`)
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }

  async function runOperation(operation: 'complete_task' | 'reopen_task') {
    const version = Number(expectedVersion)

    if (
      !taskId.trim() ||
      !Number.isSafeInteger(version) ||
      version < 1
    ) {
      setResult('Enter a valid task UUID and version.')
      return
    }

    setBusy(true)
    setResult('')

    try {
      const { data, error } = await neon.rpc(operation, {
        p_task_id: taskId.trim(),
        p_expected_version: version,
      })

      if (error) {
        setResult(`REJECTED: ${error.message}`)
        return
      }

      const { data: updated, error: readError } = await neon
        .from('tasks')
        .select('id, title, status, version, completed_at')
        .eq('id', taskId.trim())
        .maybeSingle()

      if (readError) throw new Error(readError.message)

      if (!updated) {
        setResult('Operation returned success, but read-back failed.')
        return
      }

      const saved = updated as Task
      setTask(saved)

      const valid =
        Number(data) === Number(saved.version) &&
        saved.version === version + 1 &&
        (operation === 'complete_task'
          ? saved.status === 'completed' && saved.completed_at !== null
          : saved.status === 'open' && saved.completed_at === null)

      setResult(
        valid
          ? `PASS: ${operation}. Saved version ${saved.version}.`
          : 'CHECK FAILED: Saved state did not match expectations.',
      )
    } catch (error) {
      setResult(
        `ERROR: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Daywise — Task Lifecycle Test</h2>

      <div>
        <label>
          Real Task UUID
          <input
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            placeholder="Paste task UUID"
          />
        </label>
        <button onClick={loadTask} disabled={busy}>
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

      {task && (
        <div>
          <p>Title: {task.title}</p>
          <p>Status: {task.status}</p>
          <p>Saved Version: {task.version}</p>
          <p>Completed At: {task.completed_at ?? 'NULL'}</p>
        </div>
      )}

      <button
        disabled={busy}
        onClick={() => runOperation('complete_task')}
      >
        Complete Task
      </button>

      <button disabled={busy} onClick={() => runOperation('reopen_task')}>
        Reopen Task
      </button>

      <p role="status">{result}</p>
    </section>
  )
}
