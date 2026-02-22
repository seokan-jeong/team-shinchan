/**
 * use-sse.ts
 *
 * Custom hook that opens an EventSource connection to /api/events/stream
 * and dispatches all 11 SSE event types to the Zustand dashboard store.
 *
 * Faithfully mirrors app.js connectSSE() (lines 1489-1714) and
 * handleSSEMessage() (lines 1736-1844).
 */
import { useEffect, useRef } from 'react'
import { useDashboardStore } from '../stores/dashboard-store'
import type { AgentStatus } from '../lib/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function toDate(ts: string | undefined): string {
  return ts ? new Date(ts).toISOString() : new Date().toISOString()
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useSSE(): void {
  const esRef = useRef<EventSource | null>(null)
  const currentSessionId = useDashboardStore((s) => s.currentSessionId)

  const {
    setConnected,
    updateAgentStatus,
    addTimelineEvent,
    addChatMessage,
    updateWorkflow,
    updateDelegationFlow,
    handleDebateEvent,
    setSessionStartedAt,
    setDocs,
  } = useDashboardStore.getState()

  useEffect(() => {
    // ── handleSSEMessage (app.js lines 1736-1844) ───────────────────────────

    function handleSSEMessage(data: Record<string, unknown>): void {
      const etype = (data.type as string) || null
      const ts = toDate(data.timestamp as string | undefined)

      // agent_start
      if (etype === 'agent_start' && data.agentId) {
        const agentId = data.agentId as string
        updateAgentStatus(agentId, 'working', data.message as string | undefined)
        addTimelineEvent({
          agentId,
          message: (data.message as string) || undefined,
          type: 'agent_start',
          etype: 'agent_start',
          timestamp: ts,
        })
        if (data.message) {
          addChatMessage({
            agent: agentId,
            content: data.message as string,
            timestamp: ts,
          })
        }
        return
      }

      // agent_done
      if (etype === 'agent_done' && data.agentId) {
        const agentId = data.agentId as string
        updateAgentStatus(agentId, 'completed', data.message as string | undefined)
        addTimelineEvent({
          agentId,
          message: (data.message as string) || undefined,
          type: 'agent_done',
          etype: 'agent_done',
          timestamp: ts,
        })
        return
      }

      // delegation
      if (etype === 'delegation') {
        const from = data.from as string | undefined
        const to = data.to as string | undefined
        const task = (data.task as string) || (data.message as string) || undefined
        updateDelegationFlow({ from, to })
        addTimelineEvent({
          agentId: from,
          etype: 'delegation',
          from,
          to,
          task,
          timestamp: ts,
        })
        addChatMessage({
          agent: from ?? '',
          content: task ?? '',
          timestamp: ts,
        })
        return
      }

      // chat_message
      if (etype === 'chat_message') {
        addChatMessage({
          agent: (data.agentId as string) ?? '',
          content: (data.message as string) ?? '',
          timestamp: ts,
        })
        return
      }

      // debate
      if (etype === 'debate' || data.debate_type || data.subtype) {
        handleDebateEvent(data as Parameters<typeof handleDebateEvent>[0])
        if (data.subtype === 'start' || data.debate_type === 'start' || data.type === 'start') {
          addTimelineEvent({
            agentId: 'midori',
            message: `토론 시작: ${(data.topic as string) ?? ''}`,
            etype: 'message',
            timestamp: ts,
          })
        }
        return
      }

      // user_prompt
      if (etype === 'user_prompt') {
        addTimelineEvent({
          agentId: undefined,
          message: (data.message as string) || undefined,
          etype: 'user_prompt',
          timestamp: ts,
        })
        if (data.message) {
          addChatMessage({
            agent: '',
            content: data.message as string,
            timestamp: ts,
          })
        }
        return
      }

      // workflow stage change (legacy field)
      if (data.stage) {
        updateWorkflow(
          data.stage as string,
          (data.phase as string) ?? null,
          (data.phase_title as string) ?? null,
        )
      }

      // legacy status field
      if (data.agentId && data.status) {
        const statusMap: Record<string, AgentStatus> = {
          agent_start: 'working',
          agent_done: 'completed',
        }
        const mappedStatus: AgentStatus =
          statusMap[data.status as string] ?? (data.status as AgentStatus)
        updateAgentStatus(data.agentId as string, mappedStatus, data.message as string | undefined)
      }

      // fallback: add to timeline
      if (data.message || etype) {
        addTimelineEvent({
          agentId: (data.agentId as string) ?? undefined,
          message: (data.message as string) ?? undefined,
          type: (data.eventType as string) ?? 'info',
          etype: etype ?? undefined,
          timestamp: ts,
        })
        if (etype === 'message' && data.message && data.agentId) {
          addChatMessage({
            agent: data.agentId as string,
            content: data.message as string,
            timestamp: ts,
          })
        }
      }
    }

    // ── connectSSE (app.js lines 1489-1714) ────────────────────────────────

    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    let es: EventSource
    try {
      const sseUrl = currentSessionId
        ? `/api/events/stream?session=${encodeURIComponent(currentSessionId)}`
        : '/api/events/stream'
      es = new EventSource(sseUrl)
      esRef.current = es
    } catch {
      setConnected(false)
      return
    }

    // 1. open — connection established
    es.addEventListener('open', () => {
      setConnected(true)
      const { sessionStartedAt } = useDashboardStore.getState()
      if (!sessionStartedAt) {
        setSessionStartedAt(new Date())
      }
      addTimelineEvent({
        agentId: undefined,
        message: 'SSE 스트림에 연결되었습니다.',
        type: 'success',
        timestamp: new Date().toISOString(),
      })
    })

    // 2. message — generic message -> handleSSEMessage()
    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        handleSSEMessage(data)
      } catch {
        if (e.data?.trim()) {
          addTimelineEvent({
            agentId: undefined,
            message: e.data,
            type: 'info',
            timestamp: new Date().toISOString(),
          })
        }
      }
    })

    // 3. agent_status — agent status change
    es.addEventListener('agent_status', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>

        // session_start / session_end reset
        if (data.reset) {
          const session = data.session as { active?: boolean; startedAt?: string } | undefined
          if (session?.active) {
            setSessionStartedAt(
              session.startedAt ? new Date(session.startedAt) : new Date(),
            )
          }
          return
        }

        const agentId = (data.agent as string) || (data.agentId as string)
        if (agentId && data.status) {
          // server sends: 'working' (start) | 'idle' | 'completed' (done)
          // map to UI status: working -> working, anything else -> completed
          const mappedStatus: AgentStatus =
            data.status === 'working' ? 'working' : 'completed'
          updateAgentStatus(agentId, mappedStatus, data.message as string | undefined)
          addTimelineEvent({
            agentId,
            message:
              (data.message as string) ||
              (mappedStatus === 'working' ? 'Working...' : 'Done'),
            etype: data.status === 'working' ? 'agent_start' : 'agent_done',
            timestamp: toDate(data.timestamp as string | undefined),
          })
        }
      } catch { /* ignore */ }
    })

    // 4. delegation — delegation event
    es.addEventListener('delegation', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        const from = data.from as string | undefined
        const to = data.to as string | undefined
        const task = (data.task as string) || (data.message as string) || undefined
        updateDelegationFlow({ from, to })
        addTimelineEvent({
          agentId: from,
          etype: 'delegation',
          from,
          to,
          task,
          timestamp: toDate(data.timestamp as string | undefined),
        })
      } catch { /* ignore */ }
    })

    // 5. chat_message — chat message
    es.addEventListener('chat_message', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        addChatMessage({
          // server sends `agent` field; fall back to `agentId` for compatibility
          agent: (data.agent as string) || (data.agentId as string) || '',
          // server sends `content`; fall back to `message` for compatibility
          content: (data.content as string) || (data.message as string) || '',
          timestamp: toDate(data.timestamp as string | undefined),
        })
      } catch { /* ignore */ }
    })

    // 6. debate — debate event
    es.addEventListener('debate', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        handleDebateEvent(data as Parameters<typeof handleDebateEvent>[0])
        // server sends `subtype`; legacy formats use `debate_type` or `type`
        if (data.subtype === 'start' || data.debate_type === 'start' || data.type === 'start') {
          addTimelineEvent({
            agentId: 'midori',
            message: `토론 시작: ${(data.topic as string) ?? ''}`,
            etype: 'message',
            timestamp: toDate(data.timestamp as string | undefined),
          })
        }
      } catch { /* ignore */ }
    })

    // 7. workflow_status — workflow change
    es.addEventListener('workflow_status', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        const workflow = data.workflow as Record<string, unknown> | undefined
        const stage = (workflow?.stage ?? data.stage) as string | undefined
        const phase = (workflow?.phase ?? data.phase) as string | undefined
        const phaseTitle = (workflow?.phase_title ?? data.phase_title) as string | undefined
        const progressData = (data.progress ?? null) as import('../lib/types').Progress | null

        if (stage) {
          updateWorkflow(stage, phase ?? null, phaseTitle ?? null, progressData)
        } else if (progressData) {
          // no stage but progress available: update progress only
          const { currentPhase, currentPhaseTitle } = useDashboardStore.getState()
          updateWorkflow(
            useDashboardStore.getState().currentStage,
            currentPhase,
            currentPhaseTitle,
            progressData,
          )
        }

        if (data.message) {
          addTimelineEvent({
            agentId: undefined,
            message: data.message as string,
            etype: 'workflow_update',
            timestamp: toDate(data.timestamp as string | undefined),
          })
        }
      } catch { /* ignore */ }
    })

    // 8. connected — server connection confirmation
    es.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        // Update workflow if server sends initial state
        if (data.workflow) {
          const workflow = data.workflow as Record<string, unknown>
          const stage = workflow.stage as string | undefined
          const phase = workflow.phase as string | undefined
          if (stage) {
            updateWorkflow(stage, phase ?? null)
          }
        }
      } catch { /* ignore */ }
    })

    // 9. doc_updated — document change notification
    es.addEventListener('doc_updated', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        const { activeTab, docs } = useDashboardStore.getState()

        if (activeTab === 'docs') {
          // Signal that docs list needs refresh
          setDocs({ loading: true })
          // If the currently open file changed, clear the cached content
          if (
            docs.currentFile &&
            data.filename &&
            docs.currentFile === (data.filename as string)
          ) {
            setDocs({ content: null })
          }
        }
      } catch { /* ignore */ }
    })

    // 10. activity — activity event
    es.addEventListener('activity', (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        addTimelineEvent({
          agentId: ((data.agentId ?? data.agent) as string) || undefined,
          message: ((data.message ?? data.content) as string) || undefined,
          etype: ((data.etype ?? data.type) as string) || undefined,
          timestamp: toDate(data.timestamp as string | undefined),
          ...data,
        })
      } catch (err) {
        console.error('[SSE] Activity parse error:', err)
      }
    })

    // 11. error — connection error (EventSource auto-reconnects)
    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        setConnected(false)
      } else {
        // CONNECTING state: reconnecting
        setConnected('reconnecting')
      }
    })

    // cleanup on unmount
    return () => {
      es.close()
      esRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])
}
