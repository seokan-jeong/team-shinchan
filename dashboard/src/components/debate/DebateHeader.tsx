/**
 * DebateHeader.tsx
 *
 * Mirrors app.js renderDebate() header section (lines 918-933).
 * Displays: 🌻 emoji + "Debate" label + topic + status badge.
 */
import { Badge } from '../ui/badge'
import { useDashboardStore } from '../../stores/dashboard-store'

export function DebateHeader() {
  const debateState = useDashboardStore((s) => s.debateState)
  const debateTopic = useDashboardStore((s) => s.debateTopic)

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}
    >
      {/* Emoji */}
      <span style={{ fontSize: 22 }}>🌻</span>

      {/* Label + topic */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--muted-foreground)',
            marginBottom: 2,
          }}
        >
          Debate
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--foreground)',
            lineHeight: 1.4,
          }}
        >
          {debateTopic ?? ''}
        </div>
      </div>

      {/* Status badge */}
      {debateState === 'concluded' ? (
        <Badge variant="success">결론 도출</Badge>
      ) : (
        <Badge variant="default">진행 중</Badge>
      )}
    </div>
  )
}
