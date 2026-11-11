import { useState } from 'react'
import { neon } from './lib/neon'

type Settings = {
  user_id: string
  timezone: string
  week_starts_on: number
}

export default function UserSettingsTest() {
  const [timezone, setTimezone] = useState('Asia/Manila')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadSettings() {
    const { data, error } = await neon
      .from('user_settings')
      .select('user_id, timezone, week_starts_on')
      .maybeSingle()

    if (error) {
      setMessage('LOAD FAILED: ' + error.message)
      return
    }

    setSettings(data as Settings | null)

    if (!data) {
      setMessage('No accessible settings found.')
    } else {
      setMessage('Settings loaded successfully.')
    }
  }

  async function initializeSettings() {
    setBusy(true)
    setMessage('')

    try {
      const { error } = await neon.rpc('initialize_user_settings', {
        p_timezone: timezone,
        p_week_starts_on: 1,
      })

      if (error) throw new Error(error.message)

      setMessage('Initialization request succeeded.')
      await loadSettings()
    } catch (error) {
      setMessage(
        'REJECTED: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Daywise — User Settings Test</h2>

      <label>
        Timezone:
        <select
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
        >
          <option value="Asia/Manila">Asia/Manila</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York</option>
          <option value="Invalid/Timezone">Invalid/Timezone (Test)</option>
        </select>
      </label>

      <div style={{ marginTop: 16 }}>
        <button onClick={initializeSettings} disabled={busy}>
          Initialize User Settings
        </button>

        <button onClick={loadSettings} disabled={busy}>
          Load Saved Settings
        </button>
      </div>

      {settings && (
        <div style={{ marginTop: 20 }}>
          <h3>Saved Settings</h3>
          <p>User ID: {settings.user_id}</p>
          <p>Timezone: {settings.timezone}</p>
          <p>Week Starts On: {settings.week_starts_on}</p>
        </div>
      )}

      <p role="status">{message}</p>
    </section>
  )
}
