import { useState } from 'react'
import { neon } from './lib/neon'

type TaskList = {
  id: string
  name: string
  version: number
}

type Task = {
  id: string
  title: string
  list_id: string | null
  version: number
  status: string
  due_date: string | null
}

export default function TaskListsTest() {
  const [listId, setListId] = useState('')
  const [expectedVersion, setExpectedVersion] = useState('1')
  const [newName, setNewName] = useState('QA Work')
  const [renameTo, setRenameTo] = useState('QA Work Renamed')
  const [list, setList] = useState<TaskList | null>(null)
  const [taskId, setTaskId] = useState('')
  const [task, setTask] = useState<Task | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function readList(id: string): Promise<TaskList | null> {
    const { data, error } = await neon
      .from('task_lists')
      .select('id,name,version')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as TaskList | null
  }

  async function readTask(id: string): Promise<Task | null> {
    const { data, error } = await neon
      .from('tasks')
      .select('id,title,list_id,version,status,due_date')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as Task | null
  }

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

  async function createList() {
    await run(async () => {
      const { data, error } = await neon.rpc('create_task_list', {
        p_name: newName,
      })

      if (error) {
        setMessage('REJECTED: ' + error.message)
        return
      }

      if (typeof data !== 'string') {
        throw new Error('Unexpected list ID.')
      }

      const saved = await readList(data)
      if (!saved) throw new Error('Created list not readable.')

      setListId(saved.id)
      setExpectedVersion(String(saved.version))
      setList(saved)
      setTaskId('')
      setTask(null)
      setMessage('PASS: List created and readable.')
    })
  }

  async function loadList() {
    await run(async () => {
      const saved = await readList(listId.trim())
      setList(saved)

      if (!saved) {
        setMessage('No accessible list found.')
        return
      }

      setExpectedVersion(String(saved.version))
      setMessage(`Loaded list version ${saved.version}.`)
    })
  }

  async function renameList() {
    await run(async () => {
      const id = listId.trim()
      const version = Number(expectedVersion)

      if (!id || !Number.isSafeInteger(version) || version < 1) {
        throw new Error('Enter a list UUID and valid version.')
      }

      const { data, error } = await neon.rpc('rename_task_list', {
        p_list_id: id,
        p_expected_version: version,
        p_new_name: renameTo,
      })

      if (error) {
        setMessage('REJECTED: ' + error.message)
        return
      }

      const saved = await readList(id)
      setList(saved)

      const passed =
        saved !== null &&
        saved.name === renameTo.trim() &&
        saved.version === version + 1 &&
        Number(data) === saved.version

      setMessage(
        passed
          ? `PASS: List renamed. Saved version ${saved.version}.`
          : 'CHECK FAILED: Unexpected saved list values.',
      )
    })
  }

  async function createLinkedTask() {
    await run(async () => {
      const id = listId.trim()
      const selectedList = await readList(id)

      if (!selectedList) {
        throw new Error('Load an owned list first.')
      }

      const { data, error } = await neon.rpc('create_task', {
        p_title: 'QA list preservation task',
        p_priority: 'low',
        p_due_date: '2030-12-31',
        p_list_id: id,
      })

      if (error) {
        setMessage('REJECTED: ' + error.message)
        return
      }

      if (typeof data !== 'string') {
        throw new Error('Unexpected task ID.')
      }

      const saved = await readTask(data)
      if (!saved) throw new Error('Task not readable.')

      setTaskId(saved.id)
      setTask(saved)
      setMessage(
        saved.list_id === id
          ? 'PASS: Task created inside the selected list.'
          : 'CHECK FAILED: Task was not assigned to the list.',
      )
    })
  }

  async function loadLinkedTask() {
    await run(async () => {
      if (!taskId.trim()) throw new Error('Enter a task UUID.')

      const saved = await readTask(taskId.trim())
      setTask(saved)

      setMessage(
        saved
          ? `Task loaded. List: ${saved.list_id ?? 'NULL'}`
          : 'No accessible task found.',
      )
    })
  }

  async function deleteList() {
    const id = listId.trim()
    const version = Number(expectedVersion)

    if (!id || !Number.isSafeInteger(version) || version < 1) {
      setMessage('Enter a list UUID and valid version.')
      return
    }

    if (
      !window.confirm(
        'Permanently delete this test list? ' +
          'Linked tasks should remain unassigned.',
      )
    ) {
      setMessage('CANCELED: No deletion request was sent.')
      return
    }

    await run(async () => {
      const beforeTask = taskId.trim()
        ? await readTask(taskId.trim())
        : null

      const { data, error } = await neon.rpc('delete_task_list', {
        p_list_id: id,
        p_expected_version: version,
      })

      if (error) {
        setMessage('REJECTED: ' + error.message)
        return
      }

      const afterList = await readList(id)
      const afterTask = taskId.trim()
        ? await readTask(taskId.trim())
        : null

      setList(afterList)
      setTask(afterTask)

      if (data !== id || afterList !== null) {
        setMessage('CHECK FAILED: List still accessible.')
        return
      }

      if (!beforeTask || beforeTask.list_id !== id) {
        setMessage('PASS: List deleted. Task preservation was not tested.')
        return
      }

      const preserved =
        afterTask !== null &&
        afterTask.id === beforeTask.id &&
        afterTask.list_id === null &&
        afterTask.version === beforeTask.version + 1 &&
        afterTask.title === beforeTask.title &&
        afterTask.status === beforeTask.status &&
        afterTask.due_date === beforeTask.due_date

      setMessage(
        preserved
          ? 'PASS: List deleted. Task preserved, unassigned, and version incremented.'
          : 'CHECK FAILED: Linked task was not preserved as expected.',
      )
    })
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Daywise — Task Lists Test</h2>

      <div>
        <h3>1. Create list</h3>
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New list name"
        />
        <button disabled={busy} onClick={createList}>
          Create List
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>2. Load list</h3>
        <input
          value={listId}
          onChange={(event) => setListId(event.target.value)}
          placeholder="List UUID"
        />
        <button disabled={busy} onClick={loadList}>
          Load List
        </button>
        <p>Expected Version:</p>
        <input
          type="number"
          min="1"
          value={expectedVersion}
          onChange={(event) => setExpectedVersion(event.target.value)}
        />
      </div>

      {list && (
        <div>
          <p>List: {list.name}</p>
          <p>Saved Version: {list.version}</p>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <h3>3. Rename list</h3>
        <input
          value={renameTo}
          onChange={(event) => setRenameTo(event.target.value)}
          placeholder="New list name"
        />
        <button disabled={busy} onClick={renameList}>
          Rename List
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>4. Linked task</h3>
        <button disabled={busy} onClick={createLinkedTask}>
          Create Task in List
        </button>
        <input
          value={taskId}
          onChange={(event) => setTaskId(event.target.value)}
          placeholder="Linked task UUID"
        />
        <button disabled={busy} onClick={loadLinkedTask}>
          Load Linked Task
        </button>
      </div>

      {task && (
        <div>
          <p>Task: {task.title}</p>
          <p>List ID: {task.list_id ?? 'NULL'}</p>
          <p>Task Version: {task.version}</p>
          <p>Due Date: {task.due_date ?? 'NULL'}</p>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <h3>5. Delete list</h3>
        <button disabled={busy} onClick={deleteList}>
          Delete List With Confirmation
        </button>
      </div>

      <p role="status">{message}</p>
    </section>
  )
}
