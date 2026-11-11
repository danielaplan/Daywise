import { useState } from 'react'
import TaskDeletionTest from './TaskDeletionTest'
import TaskDetailsTest from './TaskDetailsTest'
import TaskLifecycleTest from './TaskLifecycleTest'
import TaskListsTest from './TaskListsTest'
import TaskSchedulingTest from './TaskSchedulingTest'
import TaskSecurityTest from './TaskSecurityTest'
import UserSettingsTest from './UserSettingsTest'
import { neon } from './lib/neon'

function App() {
  const { data: session, isPending, error: sessionError } =
    neon.auth.useSession()

  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  async function signIn() {
    setBusy(true)
    setActionError('')

    try {
      const result = await neon.auth.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Sign-in failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    setActionError('')

    try {
      const result = await neon.auth.signOut()

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Sign-out failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (isPending) {
    return (
      <main>
        <p>Checking your session...</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 480, margin: '80px auto', padding: 24 }}>
      <h1>Daywise</h1>
      <p>Your day. Your priorities. Your progress.</p>

      {session?.user ? (
        <section>
          <h2>Welcome, {session.user.name || 'User'}!</h2>
          <p>You are signed in.</p>
          <button onClick={signOut} disabled={busy}>
            {busy ? 'Please wait...' : 'Sign Out'}
          </button>
          <TaskDeletionTest key={session.user.id} />
          <TaskDetailsTest key={session.user.id} />
          <TaskListsTest key={session.user.id} />
          <TaskSecurityTest key={session.user.id} />
          <TaskLifecycleTest key={session.user.id} />
          <TaskSchedulingTest key={session.user.id} />
          <UserSettingsTest key={session.user.id} />
        </section>
      ) : (
        <button onClick={signIn} disabled={busy}>
          {busy ? 'Please wait...' : 'Continue with Google'}
        </button>
      )}

      {sessionError && <p role="alert">Session error occurred.</p>}
      {actionError && <p role="alert">{actionError}</p>}
    </main>
  )
}

export default App
