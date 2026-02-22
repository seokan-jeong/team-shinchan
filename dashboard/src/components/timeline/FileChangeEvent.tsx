/**
 * FileChangeEvent.tsx
 *
 * Renders the file_change event layout:
 * agent name + action badge (create/modify/delete) + filename.
 * Mirrors app.js addTimelineEvent file_change branch (lines 563-577).
 */

const ACTION_COLORS: Record<string, string> = {
  create: '#3fb950',
  modify: '#58a6ff',
  delete: '#f85149',
}

interface FileChangeEventProps {
  agentName: string
  action?: string
  file?: string
  isPrevSession?: boolean
}

export function FileChangeEvent({
  agentName,
  action = 'modify',
  file = '',
  isPrevSession,
}: FileChangeEventProps) {
  const fileName   = file ? file.split('/').pop() ?? '(unknown)' : '(unknown)'
  const showPath   = file && file !== fileName
  const color      = ACTION_COLORS[action] ?? '#8b949e'

  return (
    <>
      <div className="event-agent">
        {agentName}
        {isPrevSession && (
          <span className="prev-session-label">Previous Session</span>
        )}
      </div>
      <div className="event-msg">
        <span
          style={{
            color,
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: 11,
          }}
        >
          {action}
        </span>
        <span
          style={{ marginLeft: 6, fontFamily: 'monospace', fontSize: 12 }}
        >
          {fileName}
        </span>
        {showPath && (
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              marginLeft: 4,
            }}
          >
            {file}
          </span>
        )}
      </div>
    </>
  )
}
