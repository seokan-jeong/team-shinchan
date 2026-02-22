/**
 * AppLayout.tsx
 *
 * Root CSS Grid layout that hosts header / sidebar / main / footer.
 * Mirrors the .app grid from styles.css (lines 32-43):
 *   grid-template-rows: header(56px) 1fr footer(44px)
 *   grid-template-columns: sidebar(220px) 1fr
 *   grid-template-areas: "header header" "sidebar main" "footer footer"
 */
import type { ReactNode } from 'react'
import { ConnectionAlertBar } from './ConnectionAlertBar'
import { Header } from './Header'
import { Footer } from './Footer'

interface AppLayoutProps {
  sidebar: ReactNode
  main: ReactNode
}

export function AppLayout({ sidebar, main }: AppLayoutProps) {
  return (
    <>
      {/* Fixed top alert bar — lives outside the grid so it overlays everything */}
      <ConnectionAlertBar />

      <div className="app">
        <Header />

        <aside
          className="sidebar"
          aria-label="에이전트 목록"
          role="complementary"
        >
          {sidebar}
        </aside>

        <main className="main">
          {main}
        </main>

        <Footer />
      </div>
    </>
  )
}
