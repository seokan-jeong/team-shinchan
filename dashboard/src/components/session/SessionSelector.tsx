/**
 * SessionSelector.tsx
 *
 * Dropdown component for selecting active sessions.
 * Fetches session list from GET /api/sessions periodically
 * and displays active/ended sessions with status indicators.
 */
import { useEffect } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'

export function SessionSelector() {
  const currentSessionId = useDashboardStore((s) => s.currentSessionId)
  const availableSessions = useDashboardStore((s) => s.availableSessions)
  const setCurrentSessionId = useDashboardStore((s) => s.setCurrentSessionId)
  const fetchSessions = useDashboardStore((s) => s.fetchSessions)

  // 주기적으로 세션 목록 갱신 (10초)
  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 10000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  return (
    <div className="session-selector">
      <select
        value={currentSessionId || ''}
        onChange={(e) => setCurrentSessionId(e.target.value || null)}
        className="session-select"
      >
        <option value="">All Sessions</option>
        {availableSessions.map((s) => (
          <option key={s.sessionId} value={s.sessionId}>
            {s.active ? '\u{1F7E2}' : '\u26AA'} {s.sessionId.length > 24 ? s.sessionId.slice(0, 24) + '…' : s.sessionId}
            {s.eventCount > 0 ? ` (${s.eventCount})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
