/**
 * App.tsx
 *
 * Root component. Wires together:
 *   - useSSE hook (SSE connection + store dispatch)
 *   - useInitialData hook (REST API bootstrap)
 *   - AppLayout (grid layout with header/sidebar/main/footer)
 *   - AgentSidebar (agent list in the sidebar slot)
 *   - WorkflowBar  (4-stage workflow progress bar)
 *   - PhaseProgress (phase counter, dots, overall bar, mini bars)
 *   - MetricsBar   (active agents, elapsed time, event count)
 *   - DelegationChain (current delegation flow visualization)
 *   - MainTabs (4-tab system: Activity, Chat, Debate placeholder, Docs placeholder)
 */
import { useSSE } from './hooks/use-sse'
import { useInitialData } from './hooks/use-initial-data'
import { AppLayout } from './components/layout/AppLayout'
import { AgentSidebar } from './components/sidebar/AgentSidebar'
import { WorkflowBar } from './components/workflow/WorkflowBar'
import { PhaseProgress } from './components/workflow/PhaseProgress'
import { MetricsBar } from './components/metrics/MetricsBar'
import { DelegationChain } from './components/delegation/DelegationChain'
import { MainTabs } from './components/tabs/MainTabs'

function App() {
  // Bootstrap data and real-time stream
  useSSE()
  useInitialData()

  return (
    <AppLayout
      sidebar={<AgentSidebar />}
      main={
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <WorkflowBar />
          <PhaseProgress />
          <MetricsBar />
          <DelegationChain />
          <MainTabs />
        </div>
      }
    />
  )
}

export default App
