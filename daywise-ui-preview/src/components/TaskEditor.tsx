import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Icon from './Icons'
import type { DaywiseList, DaywiseTask, Priority, TaskDraft } from '../types/daywise'
import { taskToDraft } from '../types/daywise'
import { isVersionConflict } from '../types/daywise'

type Props = {
  task: DaywiseTask | null
  lists: DaywiseList[]
  onClose: () => void
  onSave: (draft: TaskDraft) => Promise<void>
  onDelete: () => Promise<void>
  onReload: () => Promise<void>
}

export default function TaskEditor({ task, lists, onClose, onSave, onDelete, onReload }: Props) {
  const original = useMemo(() => taskToDraft(task), [task])
  const [draft, setDraft] = useState<TaskDraft>(original)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'discard' | 'delete' | 'conflict' | null>(null)
  const dirty = JSON.stringify(original) !== JSON.stringify(draft)

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        if (modal) setModal(null)
        else if (dirty) setModal('discard')
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, dirty, modal, onClose])

  const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft(previous => ({ ...previous, [key]: value }))

  function requestClose() {
    if (busy) return
    if (dirty) setModal('discard')
    else onClose()
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!draft.title.trim() || draft.title.trim().length > 200) {
      setError('A task title must be between 1 and 200 characters.')
      return
    }
    if (draft.description.length > 5000) {
      setError('Description must be 5,000 characters or less.')
      return
    }
    setBusy(true)
    try {
      await onSave(draft)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to save task.'
      setError(message)
      if (isVersionConflict(message) || message.includes('title was saved')) setModal('conflict')
    } finally {
      setBusy(false)
    }
  }

  async function deleteConfirmed() {
    setBusy(true)
    setError('')
    try {
      await onDelete()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to delete task.'
      setError(message)
      setModal(isVersionConflict(message) ? 'conflict' : null)
    } finally {
      setBusy(false)
    }
  }

  async function reloadLatest() {
    setBusy(true)
    try {
      await onReload()
      setModal(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to refresh task.')
      setModal(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="editor-overlay">
      <button type="button" className="editor-backdrop" onClick={requestClose} aria-label="Close task editor" />
      <aside className="task-editor" role="dialog" aria-modal="true" aria-label={task ? 'Edit task' : 'Create task'}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">{task ? 'Tasks / Edit details' : 'Tasks / New'}</p>
            <h2>{task ? 'Edit task' : 'New task'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close editor" onClick={requestClose}><Icon name="x" /></button>
        </div>
        <form onSubmit={save} className="editor-form">
          <label className="field">
            <span>Task title <span className="required">*</span></span>
            <input autoFocus required maxLength={200} value={draft.title}
              onChange={event => update('title', event.target.value)} placeholder="What needs to get done?" />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea rows={5} maxLength={5000} value={draft.description}
              onChange={event => update('description', event.target.value)} placeholder="Add a little context..." />
            <small>{draft.description.length} / 5,000</small>
          </label>
          <fieldset className="priority-picker">
            <legend>Priority</legend>
            <div className="priority-choices">
              {(['high', 'medium', 'low'] as Priority[]).map(priority => (
                <button type="button" key={priority}
                  className={`priority-choice ${draft.priority === priority ? `selected ${priority}` : ''}`}
                  aria-pressed={draft.priority === priority}
                  onClick={() => update('priority', priority)}>
                  <span className={`priority-dot ${priority}`} />
                  {priority[0].toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="editor-two-cols">
            <label className="field"><span>Planned date</span>
              <input type="date" value={draft.planned_date} onChange={e => update('planned_date', e.target.value)} /></label>
            <label className="field"><span>Due date</span>
              <input type="date" value={draft.due_date} onChange={e => update('due_date', e.target.value)} /></label>
          </div>
          <label className="field"><span>List</span>
            <select value={draft.list_id} onChange={e => update('list_id', e.target.value)}>
              <option value="">Inbox (no list)</option>
              {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </label>
          {task && <div className="editor-version"><Icon name="shield" size={15} /> Saved version {task.version} · Other-device changes will trigger a refresh</div>}
          {error && <div className="inline-error" role="alert"><Icon name="alert" size={17} /> {error}</div>}
          <div className="editor-footer">
            {task ? <button className="btn btn-danger-ghost" type="button" disabled={busy} onClick={() => setModal('delete')}><Icon name="trash" size={16} /> Delete</button> : <span />}
            <div className="footer-right">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={requestClose}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={busy || (Boolean(task) && !dirty)}>
                {busy ? 'Saving...' : task ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </div>
        </form>
      </aside>
      {modal && (
        <div className="modal-shade">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className={`dialog-symbol ${modal === 'delete' ? 'danger' : ''}`}><Icon name={modal === 'conflict' ? 'refresh' : 'alert'} size={22} /></div>
            <h3 id="dialog-title">
              {modal === 'discard' ? 'Discard unsaved changes?' : modal === 'delete' ? 'Permanently delete task?' : 'Editing conflict detected'}
            </h3>
            <p>{modal === 'discard'
              ? 'You have edits that haven’t been saved. Leaving now will discard them.'
              : modal === 'delete'
                ? `“${task?.title ?? 'This task'}” will be permanently deleted. This cannot be undone.`
                : 'This task may have changed elsewhere. Reload the latest version before editing again. Your current draft will be discarded if you reload.'}</p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setModal(null)}>
                {modal === 'discard' ? 'Keep editing' : 'Cancel'}
              </button>
              {modal === 'discard' && <button type="button" className="btn btn-primary" onClick={onClose}>Discard changes</button>}
              {modal === 'delete' && <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void deleteConfirmed()}>{busy ? 'Deleting...' : 'Delete task'}</button>}
              {modal === 'conflict' && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void reloadLatest()}>Reload latest</button>}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
