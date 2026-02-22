/**
 * ReviewResultEvent.tsx
 *
 * Renders the review_result event layout:
 * agent name + pass/fail/warning badge + details text.
 * Mirrors app.js addTimelineEvent review_result branch (lines 578-590).
 */

type ReviewResult = 'pass' | 'fail' | 'warning'

interface ReviewResultEventProps {
  agentName: string
  result?: ReviewResult | string
  details?: string
  isPrevSession?: boolean
}

export function ReviewResultEvent({
  agentName,
  result = 'pass',
  details,
  isPrevSession,
}: ReviewResultEventProps) {
  return (
    <>
      <div className="event-agent">
        {agentName}
        <span className={`review-badge ${result}`}>
          {result.toUpperCase()}
        </span>
        {isPrevSession && (
          <span className="prev-session-label">Previous Session</span>
        )}
      </div>
      {details && <div className="event-msg">{details}</div>}
    </>
  )
}
