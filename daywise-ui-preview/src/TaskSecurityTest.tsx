import { useState } from 'react'
import { neon } from './lib/neon'

type TestTask = {
  id: string
  title: string
  created_at: string
}

export default function TaskSecurityTest() {
  const [title, setTitle] = useState('')
  const [tasks, setTasks] = useState<TestTask[]>([])
  const [lookupId, setLookupId] = useState('')
  const [lookupResult, setLookupResult] = useState('')
  const [protectedTaskId, setProtectedTaskId] = useState('')
  const [securityResults, setSecurityResults] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadTasks() {
    setBusy(true)
    setMessage('')

    try {
      const { data, error } = await neon
        .from('task_security_test')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      setTasks((data ?? []) as TestTask[])
      setMessage('Task query completed.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Query failed')
    } finally {
      setBusy(false)
    }
  }

  async function createTask() {
    if (!title.trim()) return

    setBusy(true)
    setMessage('')

    try {
      const { error } = await neon
        .from('task_security_test')
        .insert({ title: title.trim() })

      if (error) throw new Error(error.message)

      setTitle('')
      setMessage('Task created successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Creation failed')
    } finally {
      setBusy(false)
    }
  }

  async function checkTaskId() {
    if (!lookupId.trim()) return

    setBusy(true)
    setLookupResult('')

    try {
      const { data, error } = await neon
        .from('task_security_test')
        .select('id, title')
        .eq('id', lookupId.trim())

      if (error) throw new Error(error.message)

      setLookupResult(
        data && data.length > 0
          ? 'Task is accessible to this account.'
          : 'No accessible task found for this ID.',
      )
    } catch (error) {
      setLookupResult(error instanceof Error ? error.message : 'Lookup failed')
    } finally {
      setBusy(false)
    }
  }

  async function runWriteProtectionTests() {
    if (!protectedTaskId.trim()) {
      setSecurityResults([
        'Enter an existing disposable task ID owned by a different test account.',
      ])
      return
    }

    const taskId = protectedTaskId.trim()
    const checks = [
      {
        name: 'Forged owner ID',
        run: () =>
          neon
            .from('task_security_test')
            .insert({
              title: 'Ownership test',
              owner_id: crypto.randomUUID(),
            })
            .select('id'),
      },
      {
        name: 'Blank task title',
        run: () =>
          neon
            .from('task_security_test')
            .insert({ title: '   ' })
            .select('id'),
      },
      {
        name: 'Title over 200 characters',
        run: () =>
          neon
            .from('task_security_test')
            .insert({ title: 'A'.repeat(201) })
            .select('id'),
      },
      {
        name: 'Unauthorized update',
        run: () =>
          neon
            .from('task_security_test')
            .update({ title: 'Modified without permission' })
            .eq('id', taskId)
            .select('id'),
        expectNoRows: true,
      },
      {
        name: 'Unauthorized deletion',
        run: () =>
          neon
            .from('task_security_test')
            .delete()
            .eq('id', taskId)
            .select('id'),
        expectNoRows: true,
      },
    ]

    setBusy(true)
    setSecurityResults([])
    const results: string[] = []

    try {
      for (const check of checks) {
        try {
          const { data, error } = await check.run()

          if (error) {
            results.push(`${check.name}: SERVER REJECTION — ${error.message}`)
            continue
          }

          if (check.expectNoRows && data.length === 0) {
            results.push(
              `${check.name}: NO ROWS AFFECTED — consistent with row-level protection; verify the database policy.`,
            )
            continue
          }

          results.push(
            `${check.name}: UNEXPECTED SUCCESS — inspect the database; this operation may have changed data.`,
          )
          break
        } catch (error) {
          results.push(
            `${check.name}: INCONCLUSIVE — ${
              error instanceof Error ? error.message : 'Request failed'
            }`,
          )
          break
        }
      }

      setSecurityResults(results)
    } finally {
      setBusy(false)
    }
  }

  const [realTaskResult, setRealTaskResult] = useState('')

  async function createRealDaywiseTask() {
    setBusy(true)
    setRealTaskResult('')

    try {
      const { data: taskId, error } = await neon.rpc('create_task', {
        p_title: 'My first real Daywise task',
        p_priority: 'medium',
      })

      if (error) {
        throw new Error(error.message)
      }

      if (typeof taskId !== 'string') {
        throw new Error('Unexpected task ID returned.')
      }

      const { data: savedTasks, error: readError } = await neon
        .from('tasks')
        .select('id, title, priority, status, version')
        .eq('id', taskId)

      if (readError) {
        throw new Error(readError.message)
      }

      if (!savedTasks || savedTasks.length !== 1) {
        throw new Error('Task created, but read-back verification failed.')
      }

      setRealTaskResult('PASS: Task created and retrieved successfully.')
    } catch (error) {
      setRealTaskResult(
        'TEST FAILED: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setBusy(false)
    }
  }

  const [realLookupId, setRealLookupId] = useState('')
  const [realLookupResult, setRealLookupResult] = useState('')

  async function checkRealTaskAccess() {
    setRealLookupResult('')

    try {
      const { data, error } = await neon
        .from('tasks')
        .select('id, title')
        .eq('id', realLookupId.trim())

      if (error) {
        throw new Error(error.message)
      }

      if (data && data.length > 0) {
        setRealLookupResult('VISIBLE: This account can access the task.')
      } else {
        setRealLookupResult('NOT VISIBLE: No accessible task found.')
      }
    } catch (error) {
      setRealLookupResult(
        error instanceof Error ? error.message : 'Request failed.',
      )
    }
  }

  const [editId, setEditId] = useState('')
  const [editVersion, setEditVersion] = useState('1')
  const [editTitle, setEditTitle] = useState('')
  const [editResult, setEditResult] = useState('')
  const [editBusy, setEditBusy] = useState(false)

  async function loadTaskForEditing() {
    setEditResult('')

    const { data, error } = await neon
      .from('tasks')
      .select('id, title, version')
      .eq('id', editId.trim())
      .maybeSingle()

    if (error) {
      setEditResult(`ERROR: ${error.message}`)
      return
    }

    if (!data) {
      setEditResult('No accessible task found.')
      return
    }

    setEditVersion(String(data.version))
    setEditTitle(data.title)
    setEditResult(`Loaded task version ${data.version}`)
  }

  async function saveTestEdit() {
    setEditBusy(true)
    setEditResult('')

    try {
      const version = Number(editVersion)

      if (!Number.isSafeInteger(version) || version < 1) {
        throw new Error('Invalid expected version.')
      }

      const { data, error } = await neon.rpc('update_task_title', {
        p_task_id: editId.trim(),
        p_expected_version: version,
        p_new_title: editTitle,
      })

      if (error) {
        setEditResult(`REJECTED: ${error.message}`)
        return
      }

      setEditResult(`SUCCESS: Task updated. New version: ${data}`)
    } catch (error) {
      setEditResult(
        `ERROR: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 32, maxWidth: 600 }}>
      <h2>Daywise — Database Security Test</h2>

      <h3>Create Test Task</h3>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Enter test task"
      />
      <button onClick={createTask} disabled={busy}>
        Create
      </button>

      <h3>My Tasks</h3>
      <button onClick={loadTasks} disabled={busy}>
        Load My Tasks
      </button>

      {tasks.map((task) => (
        <div key={task.id} style={{ marginTop: 12 }}>
          <strong>{task.title}</strong>
          <div style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            ID: {task.id}
          </div>
        </div>
      ))}

      <h3>Check Task By ID</h3>
      <input
        value={lookupId}
        onChange={(event) => setLookupId(event.target.value)}
        placeholder="Paste task UUID"
      />
      <button onClick={checkTaskId} disabled={busy}>
        Check Access
      </button>

      <p role="status">{lookupResult}</p>
      <p role="status">{message}</p>

      <div style={{ marginTop: 32 }}>
        <h3>Write Protection Tests</h3>
        <p>
          Use a disposable task ID created by a different test account. Update
          and delete checks target that task, not one of your own.
        </p>
        <input
          value={protectedTaskId}
          onChange={(event) => setProtectedTaskId(event.target.value)}
          placeholder="Other account's disposable task UUID"
        />
        <button
          onClick={runWriteProtectionTests}
          disabled={busy || !protectedTaskId.trim()}
        >
          Run Security Tests
        </button>

        <div aria-live="polite">
          {securityResults.map((result, index) => (
            <p key={index}>{result}</p>
          ))}
        </div>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>Real Daywise Task Test</h2>
        <p>This creates a persistent task in the Daywise tasks table.</p>
        <button onClick={createRealDaywiseTask} disabled={busy}>
          Create Real Task
        </button>
        <p role="status">{realTaskResult}</p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Real Task Isolation Test</h2>
        <input
          value={realLookupId}
          onChange={(event) => setRealLookupId(event.target.value)}
          placeholder="Paste real task UUID"
        />
        <button onClick={checkRealTaskAccess}>
          Check Real Task Access
        </button>
        <p role="status">{realLookupResult}</p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Task Version Security Test</h2>

        <label>
          Task UUID
          <input
            value={editId}
            onChange={(event) => setEditId(event.target.value)}
            placeholder="Enter task UUID"
          />
        </label>

        <button onClick={loadTaskForEditing}>Load Task</button>

        <div>
          <label>
            Expected Version
            <input
              type="number"
              min="1"
              value={editVersion}
              onChange={(event) => setEditVersion(event.target.value)}
            />
          </label>
        </div>

        <div>
          <label>
            New Title
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
            />
          </label>
        </div>

        <button onClick={saveTestEdit} disabled={editBusy}>
          {editBusy ? 'Saving...' : 'Test Task Update'}
        </button>

        <p role="status">{editResult}</p>
      </section>
    </section>
  )
}
