/**
 * ChatView.tsx
 *
 * Chat tab content:
 *   - Empty state: "에이전트 대화가 여기에 표시됩니다"
 *   - ScrollArea for message list
 *   - Auto-scroll to latest message when chatMessages changes
 *   - Subscribes to Zustand store chatMessages[]
 *
 * Mirrors app.js addChatMessage() (lines 636-723) and
 * _appendDelegationBubble() (lines 726-775).
 */
import { useRef, useEffect } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'
import { ScrollArea } from '../ui/scroll-area'
import { ChatBubble } from './ChatBubble'
import type { ChatMessage } from '../../lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Determine if a ChatMessage is a delegation event */
function isDelegationMessage(msg: ChatMessage): boolean {
  return msg.parsed?.type === 'delegation_message'
}

/** Determine if a ChatMessage is a user message */
function isUserMessage(msg: ChatMessage): boolean {
  return !msg.agent || msg.agent === '' || msg.agent === 'user'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatView() {
  const chatMessages = useDashboardStore((s) => s.chatMessages)
  const scrollRef    = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  return (
    <div
      role="tabpanel"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ScrollArea style={{ flex: 1 }}>
        <div
          ref={scrollRef}
          className="chat-container"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {/* Empty state */}
          {chatMessages.length === 0 && (
            <div className="chat-empty">
              <div className="empty-icon">💬</div>
              <div className="empty-text">에이전트 대화가 여기에 표시됩니다</div>
              <div className="empty-hint">
                에이전트들이 서로 대화하거나 위임할 때 여기에 표시됩니다.
              </div>
            </div>
          )}

          {/* Chat bubbles */}
          {chatMessages.map((msg, idx) => {
            const isDelegation = isDelegationMessage(msg)
            const isUser       = !isDelegation && isUserMessage(msg)

            return (
              <ChatBubble
                key={`${msg.timestamp}-${idx}`}
                message={msg}
                isUser={isUser}
                isDelegation={isDelegation}
                delegationFrom={msg.parsed?.from}
                delegationTo={msg.parsed?.to}
                delegationTask={msg.parsed?.content}
              />
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
