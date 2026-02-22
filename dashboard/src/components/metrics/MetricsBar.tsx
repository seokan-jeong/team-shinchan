/**
 * MetricsBar.tsx
 *
 * Real-time metrics bar displayed below PhaseProgress.
 * Shows active agent count, elapsed session time, and event count.
 * Updates every second via setInterval.
 *
 * Mirrors app.js startMetricsTicker() (lines 429-462).
 * Styles from styles.css .metrics-* (lines 556-594).
 *
 * Subscribes to: agentStatuses, sessionStartedAt, events from Zustand store.
 */
import { useEffect, useState } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'

export function MetricsBar() {
  const agentStatuses = useDashboardStore((s) => s.agentStatuses)
  const sessionStartedAt = useDashboardStore((s) => s.sessionStartedAt)
  const events = useDashboardStore((s) => s.events)

  // Tick state to force re-render every second
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Active agent count
  const activeCount = Object.values(agentStatuses).filter(
    (s) => s === 'working'
  ).length

  // Elapsed time (mm:ss)
  let elapsedText = '--:--'
  if (sessionStartedAt) {
    const diffMs = Date.now() - sessionStartedAt.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const mm = String(Math.floor(diffSec / 60)).padStart(2, '0')
    const ss = String(diffSec % 60).padStart(2, '0')
    elapsedText = `${mm}:${ss}`
  }

  const eventCount = events.length

  return (
    <div
      className="metrics-bar"
      role="status"
      aria-label="실시간 지표: 활성 에이전트, 경과 시간, 이벤트 수"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="metric-item">
        <span className="metric-label">Active</span>
        <span
          className={`metric-value${activeCount > 0 ? ' active' : ''}`}
          id="metric-active"
        >
          {activeCount}
        </span>
      </div>

      <div className="metric-sep" />

      <div className="metric-item">
        <span className="metric-label">Elapsed</span>
        <span className="metric-value" id="metric-elapsed">
          {elapsedText}
        </span>
      </div>

      <div className="metric-sep" />

      <div className="metric-item">
        <span className="metric-label">Events</span>
        <span className="metric-value" id="metric-events">
          {eventCount}
        </span>
      </div>
    </div>
  )
}
