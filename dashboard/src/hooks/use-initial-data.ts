/**
 * use-initial-data.ts
 *
 * Custom hook that fetches initial state from the REST API on mount.
 * Mirrors app.js loadInitialData() (lines 1388-1483).
 *
 * Endpoints:
 *   GET /api/status  — workflow state + session start time
 *   GET /api/agents  — per-agent status
 *   GET /api/events?limit=200 — previous session events
 */
import { useEffect } from 'react'
import { useDashboardStore } from '../stores/dashboard-store'
import type { AgentStatus, Progress, TimelineEvent } from '../lib/types'

export function useInitialData(): void {
  const currentSessionId = useDashboardStore((s) => s.currentSessionId)
  const {
    updateWorkflow,
    updateAgentStatus,
    addTimelineEvent,
    setSessionStartedAt,
  } = useDashboardStore.getState()

  useEffect(() => {
    let cancelled = false

    async function loadInitialData(): Promise<void> {
      const sessionParam = currentSessionId
        ? `?session=${encodeURIComponent(currentSessionId)}`
        : ''

      // ── 1. GET /api/status ──────────────────────────────────────────────
      // app.js lines 1390-1414
      try {
        const res = await fetch(`/api/status${sessionParam}`)
        if (!cancelled && res.ok) {
          const data = (await res.json()) as Record<string, unknown>
          /*
           * Server response shape (M-4 format):
           * {
           *   workflow: { stage, phase, phase_title, ... },
           *   session:  { startedAt, ... },
           *   progress: { total, completed, percentage, phases },
           * }
           * Legacy fallback: data.stage / data.phase / data.phase_title
           */
          const workflow = data.workflow as Record<string, unknown> | undefined
          const stage = (workflow?.stage ?? data.stage) as string | undefined
          const phase = (workflow?.phase ?? data.phase) as string | undefined
          const phaseTitle = (workflow?.phase_title ?? data.phase_title) as
            | string
            | undefined
          const progressData = (data.progress ?? null) as Progress | null

          if (stage) {
            updateWorkflow(stage, phase ?? null, phaseTitle ?? null, progressData)
          }

          const session = data.session as { startedAt?: string } | undefined
          if (session?.startedAt) {
            setSessionStartedAt(new Date(session.startedAt))
          }
        }
      } catch {
        // Server not connected — ignore (static mode)
      }

      if (cancelled) return

      // ── 2. GET /api/agents ──────────────────────────────────────────────
      // app.js lines 1417-1442
      try {
        const res = await fetch(`/api/agents${sessionParam}`)
        if (!cancelled && res.ok) {
          const data = (await res.json()) as Record<string, unknown>
          /*
           * Server response shape (M-4 format):
           * { agents: [ { id, emoji, name, role, status: { active } }, ... ] }
           * Legacy fallback: { id: statusString } plain object
           */
          if (Array.isArray(data.agents)) {
            for (const agent of data.agents as Array<
              Record<string, unknown>
            >) {
              const status = (agent.status as { active?: boolean } | undefined)
                ?.active
                ? 'working'
                : 'idle'
              updateAgentStatus(agent.id as string, status as AgentStatus)
            }
          } else {
            // Legacy: { shinnosuke: 'working', bo: 'completed', ... }
            for (const [id, status] of Object.entries(data)) {
              updateAgentStatus(id, status as AgentStatus)
            }
          }
        }
      } catch {
        // Server not connected — ignore (static mode)
      }

      if (cancelled) return

      // ── 3. GET /api/events?limit=200 ────────────────────────────────────
      // app.js lines 1445-1483
      try {
        const eventsUrl = currentSessionId
          ? `/api/events?session=${encodeURIComponent(currentSessionId)}&limit=200`
          : '/api/events?limit=200'
        const res = await fetch(eventsUrl)
        if (!cancelled && res.ok) {
          const data = (await res.json()) as {
            hasPreviousSession?: boolean
            events?: TimelineEvent[]
          }

          if (
            data.hasPreviousSession &&
            Array.isArray(data.events) &&
            data.events.length > 0
          ) {
            const prevEvents = data.events.filter(
              (ev) => ev.fromPreviousSession === true,
            )

            if (prevEvents.length > 0) {
              /*
               * Add in reverse order so that the oldest event ends up first
               * in the store (addTimelineEvent prepends each item, so
               * iterating oldest→newest would place newest at index 0).
               * app.js iterates from prevEvents.length-1 down to 0.
               */
              for (let i = prevEvents.length - 1; i >= 0; i--) {
                const ev = prevEvents[i]
                addTimelineEvent({
                  agentId: (ev.agent as string) || undefined,
                  message:
                    (ev.content as string) ||
                    (ev.task as string) ||
                    (ev.message as string) ||
                    undefined,
                  type: (ev.type as string) || 'info',
                  etype: (ev.type as string) || undefined,
                  timestamp: ev.timestamp
                    ? new Date(ev.timestamp).toISOString()
                    : new Date().toISOString(),
                  from: ev.from,
                  to: ev.to,
                  task: ev.task,
                  fromPreviousSession: true,
                })
              }
            }
          }
        }
      } catch {
        // Server not connected — ignore (static mode)
      }
    }

    // 세션 변경 시 기존 데이터 리셋
    const { resetSession } = useDashboardStore.getState()
    resetSession()

    void loadInitialData()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])
}
