/**
 * Header.tsx
 *
 * Top bar with brand identity and connection status badge.
 * Mirrors app.js setConnected() DOM side (lines 1348-1383) and
 * index.html <header> structure (lines 20-33).
 *
 * The store now preserves the full tri-state: true | false | 'reconnecting'.
 * ConnectionBadge maps each state to the appropriate CSS modifier class.
 */
import { useDashboardStore } from '../../stores/dashboard-store'
import { SessionSelector } from '../session/SessionSelector'

// ── ConnectionBadge ──────────────────────────────────────────────────────────

interface BadgeProps {
  connected: boolean | 'reconnecting'
}

function ConnectionBadge({ connected }: BadgeProps) {
  let badgeClass: string
  let label: string
  let ariaLabel: string

  if (connected === true) {
    badgeClass = 'conn-badge connected'
    label = 'Connected'
    ariaLabel = '연결 상태: 연결됨'
  } else if (connected === 'reconnecting') {
    badgeClass = 'conn-badge reconnecting'
    label = 'Reconnecting…'
    ariaLabel = '연결 상태: 재연결 중'
  } else {
    badgeClass = 'conn-badge disconnected'
    label = 'Disconnected'
    ariaLabel = '연결 상태: 연결 끊김'
  }

  return (
    <div className={badgeClass} aria-label={ariaLabel} role="status">
      <div className="conn-dot" />
      <span>{label}</span>
    </div>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  const connected = useDashboardStore((s) => s.connected)

  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo">👦</div>
        <div>
          <h1>Team-Shinchan Dashboard</h1>
          <div className="subtitle">Multi-Agent Workflow Monitor</div>
        </div>
      </div>
      <div className="header-controls">
        <SessionSelector />
        <ConnectionBadge connected={connected} />
      </div>
    </header>
  )
}
