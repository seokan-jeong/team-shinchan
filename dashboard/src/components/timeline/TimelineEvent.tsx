/**
 * TimelineEvent.tsx
 *
 * Single timeline event row. Handles all 13 event types with correct:
 *   - Time (HH:MM:SS)
 *   - Icon (from getEventIcon map, or agent emoji fallback)
 *   - Left border color per etype (via data-etype CSS attribute)
 *   - review_result adds data-review-result for CSS pass/fail/warning border
 *   - Previous session events: opacity 72%, lighter bg
 *
 * Mirrors app.js addTimelineEvent() (lines 518-623).
 */
import { memo } from 'react'
import type { TimelineEvent as TimelineEventType } from '../../lib/types'
import { AGENTS } from '../../lib/constants'
import { formatTime } from '../../lib/utils'
import { DelegationEvent } from './DelegationEvent'
import { FileChangeEvent } from './FileChangeEvent'
import { ReviewResultEvent } from './ReviewResultEvent'

// ── Icon map (mirrors app.js getEventIcon, lines 476-500) ──────────────────────

function getEventIcon(
  etype: string | null | undefined,
  data: TimelineEventType,
): string | null {
  if (!etype) return null

  if (etype === 'review_result') {
    const r = (data as Record<string, unknown>).result as string | undefined
    if (r === 'fail')    return '❌'
    if (r === 'warning') return '⚠️'
    return '✅'
  }

  const icons: Record<string, string> = {
    agent_start:     '🟢',
    agent_done:      '🔴',
    delegation:      '➡️',
    message:         '💬',
    user_prompt:     '👤',
    tool_use:        '🔧',
    stop:            '⏹️',
    session_start:   '🚀',
    session_end:     '🏁',
    workflow_update: '📋',
    file_change:     '📄',
    plan_step:       '📋',
    progress_update: '📊',
  }

  return icons[etype] ?? null
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TimelineEventProps {
  event: TimelineEventType
}

export const TimelineEventItem = memo(function TimelineEventItem({ event }: TimelineEventProps) {
  const etype    = event.type ?? null
  const agentId  = event.agent ?? null
  const agentData = agentId
    ? (AGENTS[agentId as keyof typeof AGENTS] ?? { emoji: '🤖', name: agentId })
    : { emoji: '🤖', name: 'System' }

  const icon      = getEventIcon(etype, event) ?? agentData.emoji
  const agentName = agentData.name
  const ts        = event.timestamp ? formatTime(event.timestamp) : ''
  const isPrev    = Boolean(event.fromPreviousSession)
  const message   = (event.content ?? (event as Record<string, unknown>).message ?? '') as string

  // Build data attributes for CSS-driven border colours
  const dataAttrs: Record<string, string> = {}
  if (etype) {
    dataAttrs['data-etype'] = etype
  } else {
    dataAttrs['data-type'] = (event as Record<string, unknown>).eventType as string || 'info'
  }
  if (etype === 'review_result') {
    const r = (event as Record<string, unknown>).result as string | undefined
    if (r) dataAttrs['data-review-result'] = r
  }

  // Render body
  let body: React.ReactNode

  if (etype === 'delegation' && (event.from || event.to)) {
    body = (
      <>
        <DelegationEvent from={event.from} to={event.to} task={event.task} />
        {isPrev && <span className="prev-session-label">Previous Session</span>}
      </>
    )
  } else if (etype === 'file_change') {
    const action   = (event as Record<string, unknown>).action as string | undefined
    const filePath = (event as Record<string, unknown>).file as string
                  ?? message
    body = (
      <FileChangeEvent
        agentName={agentName}
        action={action}
        file={filePath}
        isPrevSession={isPrev}
      />
    )
  } else if (etype === 'review_result') {
    const result  = (event as Record<string, unknown>).result as string | undefined
    const details = (event as Record<string, unknown>).details as string | undefined ?? message
    body = (
      <ReviewResultEvent
        agentName={agentName}
        result={result}
        details={details}
        isPrevSession={isPrev}
      />
    )
  } else {
    body = (
      <>
        <div className="event-agent">
          {agentName}
          {isPrev && <span className="prev-session-label">Previous Session</span>}
        </div>
        {message && <div className="event-msg">{message}</div>}
      </>
    )
  }

  return (
    <div
      className={`event-item${isPrev ? ' prev-session' : ''}`}
      {...dataAttrs}
    >
      <div className="event-time">{ts}</div>
      <div className="event-emoji">{icon}</div>
      <div className="event-body">{body}</div>
    </div>
  )
})
