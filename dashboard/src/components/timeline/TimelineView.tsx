/**
 * TimelineView.tsx
 *
 * Activity Timeline tab content:
 *   - "Activity Timeline" header + event count badge
 *   - ScrollArea for the event list
 *   - Empty state: "아직 활동이 없습니다"
 *   - Session break divider ("--- Session Break ---")
 *   - Subscribes to Zustand store events[] (newest first)
 *
 * Mirrors app.js addTimelineEvent() rendering (lines 518-623).
 */
import { useMemo } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'
import { ScrollArea } from '../ui/scroll-area'
import { TimelineEventItem } from './TimelineEvent'

export function TimelineView() {
  const events = useDashboardStore((s) => s.events)

  // Determine session break index: first event where fromPreviousSession flips
  // Events are newest-first; previous session events come at the end of the array
  const sessionBreakIdx = useMemo(
    () => events.findIndex((e) => e.fromPreviousSession),
    [events],
  )

  return (
    <div
      role="tabpanel"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 20px', gap: 12 }}
    >
      {/* Header */}
      <div className="timeline-header" style={{ flexShrink: 0 }}>
        <span className="timeline-title">Activity Timeline</span>
        <span className="event-count" aria-live="polite" aria-atomic="true">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable event list */}
      <ScrollArea style={{ flex: 1 }}>
        <div
          className="timeline"
          role="log"
          aria-label="Activity timeline events"
          aria-live="polite"
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {/* Empty state */}
          {events.length === 0 && (
            <div className="timeline-empty">
              <div className="empty-icon">📡</div>
              <div className="empty-text">아직 활동이 없습니다</div>
              <div className="empty-hint">
                에이전트가 작업을 시작하면 여기에 타임라인이 표시됩니다.
              </div>
            </div>
          )}

          {/* Event items */}
          {events.map((event, idx) => (
            <div key={event.id}>
              {/* Session break divider before the first previous-session event */}
              {idx === sessionBreakIdx && sessionBreakIdx > 0 && (
                <div
                  className="session-break"
                  role="separator"
                  aria-label="이전 세션과 현재 세션 구분"
                >
                  Session Break
                </div>
              )}
              <TimelineEventItem event={event} />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
