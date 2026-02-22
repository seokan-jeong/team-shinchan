/**
 * MainTabs.tsx
 *
 * 4-tab system using shadcn Tabs:
 *   - 📡 Activity  (Timeline)
 *   - 💬 Chat
 *   - 🌻 Debate
 *   - 📄 Docs
 *
 * Mirrors app.js initTabs() / switchTab() (lines 78-117).
 * Subscribes to Zustand store's activeTab so debate events can auto-switch.
 */
import { useEffect, lazy, Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { TimelineView } from '../timeline/TimelineView'
import { ChatView } from '../chat/ChatView'
import { useDashboardStore } from '../../stores/dashboard-store'

// Lazy-load heavy tab views to split the bundle
const DebateView = lazy(() =>
  import('../debate/DebateView').then((m) => ({ default: m.DebateView })),
)
const DocsView = lazy(() =>
  import('../docs/DocsView').then((m) => ({ default: m.DocsView })),
)

function TabFallback() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted-foreground)',
        fontSize: 13,
      }}
    >
      Loading...
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'timeline', icon: '📡', label: 'Activity' },
  { id: 'chat',     icon: '💬', label: 'Chat' },
  { id: 'debate',   icon: '🌻', label: 'Debate' },
  { id: 'docs',     icon: '📄', label: 'Docs' },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export function MainTabs() {
  const activeTab    = useDashboardStore((s) => s.activeTab)
  const setActiveTab = useDashboardStore((s) => s.setActiveTab)

  // Auto-switch to debate tab when debateState becomes 'active'
  const debateState = useDashboardStore((s) => s.debateState)
  useEffect(() => {
    if (debateState === 'active') {
      setActiveTab('debate')
    }
  }, [debateState, setActiveTab])

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Tab bar */}
      <TabsList role="tablist">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {/* Hide label on narrow screens (<768px) */}
            <span className="hidden-mobile-tab-label">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab panels */}
      <TabsContent
        value="timeline"
        id="tabpanel-timeline"
        role="tabpanel"
        aria-labelledby="tab-timeline"
      >
        <TimelineView />
      </TabsContent>

      <TabsContent
        value="chat"
        id="tabpanel-chat"
        role="tabpanel"
        aria-labelledby="tab-chat"
      >
        <ChatView />
      </TabsContent>

      <TabsContent
        value="debate"
        id="tabpanel-debate"
        role="tabpanel"
        aria-labelledby="tab-debate"
      >
        <Suspense fallback={<TabFallback />}>
          <DebateView />
        </Suspense>
      </TabsContent>

      <TabsContent
        value="docs"
        id="tabpanel-docs"
        role="tabpanel"
        aria-labelledby="tab-docs"
      >
        <Suspense fallback={<TabFallback />}>
          <DocsView />
        </Suspense>
      </TabsContent>
    </Tabs>
  )
}
