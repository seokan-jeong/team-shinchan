/**
 * DocsView.tsx
 *
 * Main docs viewer layout.
 * Mirrors app.js docs container (lines 1207-1341).
 *
 * Layout:
 *   - Left sidebar (160px): DocFileList
 *   - Right content area (flex 1): DocContent
 *
 * Triggers file list load when docs tab becomes active.
 */
import { useCallback } from 'react'
import { DocFileList } from './DocFileList'
import { DocContent } from './DocContent'
import { useDashboardStore } from '../../stores/dashboard-store'

export function DocsView() {
  const docs = useDashboardStore((s) => s.docs)
  const setDocs = useDashboardStore((s) => s.setDocs)

  const handleSelectFile = useCallback(
    (filename: string) => {
      setDocs({ currentFile: filename, content: null })
    },
    [setDocs],
  )

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Left sidebar: file list */}
      <div
        style={{
          width: 160,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          padding: '12px 8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}
      >
        {/* Sidebar title */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--muted-foreground)',
            padding: '0 2px 8px',
          }}
        >
          Documents
        </div>

        <DocFileList onSelectFile={handleSelectFile} />
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DocContent filename={docs.currentFile} />
      </div>
    </div>
  )
}
