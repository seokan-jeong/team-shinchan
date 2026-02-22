/**
 * DocFileList.tsx
 *
 * Sidebar file list for the docs viewer.
 * Mirrors app.js renderDocFileList() / loadDocs() (lines 1247-1271).
 *
 * - Loads file list from GET /api/docs
 * - Existing files: clickable with active highlight
 * - Missing files: opacity 40%, non-interactive
 * - Auto-selects first existing file on mount
 */
import { useEffect, useState } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'

interface DocFile {
  name: string
  exists: boolean
  displayName?: string
}

interface DocFileListProps {
  onSelectFile: (filename: string) => void
}

export function DocFileList({ onSelectFile }: DocFileListProps) {
  const docs = useDashboardStore((s) => s.docs)
  const setDocs = useDashboardStore((s) => s.setDocs)
  const [files, setFiles] = useState<DocFile[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const currentFile = docs.currentFile

  // Load file list
  useEffect(() => {
    let cancelled = false

    async function loadFileList() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const res = await fetch('/api/docs')
        if (!res.ok) {
          if (!cancelled) setLoadError('목록 로드 실패')
          return
        }
        const data = await res.json() as { docs?: DocFile[] }
        if (cancelled) return

        const docList = data.docs ?? []
        setFiles(docList)

        // Auto-select first existing file if none selected
        if (!currentFile) {
          const first = docList.find((d) => d.exists)
          if (first) {
            onSelectFile(first.name)
          }
        }
      } catch {
        if (!cancelled) setLoadError('서버 연결 실패')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadFileList()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload when SSE signals doc_updated (docs.loading becomes true)
  useEffect(() => {
    if (!docs.loading) return

    let cancelled = false

    async function reload() {
      try {
        const res = await fetch('/api/docs')
        if (!res.ok || cancelled) return
        const data = await res.json() as { docs?: DocFile[] }
        if (!cancelled) {
          setFiles(data.docs ?? [])
          setDocs({ loading: false })
        }
      } catch {
        if (!cancelled) setDocs({ loading: false })
      }
    }

    reload()
    return () => { cancelled = true }
  }, [docs.loading, setDocs])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ padding: '8px 6px', fontSize: 11, color: 'var(--muted-foreground)' }}>
        로딩 중...
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ padding: '8px 6px', fontSize: 11, color: 'var(--destructive)' }}>
        {loadError}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div style={{ padding: '8px 6px', fontSize: 11, color: 'var(--muted-foreground)' }}>
        문서 없음
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {files.map((doc) => {
        const isActive = currentFile === doc.name
        const isMissing = !doc.exists

        return (
          <div
            key={doc.name}
            role={doc.exists ? 'button' : undefined}
            tabIndex={doc.exists ? 0 : undefined}
            aria-pressed={isActive ? true : undefined}
            onClick={doc.exists ? () => onSelectFile(doc.name) : undefined}
            onKeyDown={
              doc.exists
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectFile(doc.name)
                    }
                  }
                : undefined
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 10px',
              borderRadius: 6,
              fontSize: 11,
              cursor: doc.exists ? 'pointer' : 'default',
              opacity: isMissing ? 0.4 : 1,
              pointerEvents: isMissing ? 'none' : 'auto',
              background: isActive ? 'rgba(88,166,255,0.12)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
              fontWeight: isActive ? 600 : 400,
              transition: 'background 0.15s, color 0.15s',
              wordBreak: 'break-all',
              lineHeight: 1.4,
            }}
          >
            <span style={{ flexShrink: 0, fontSize: 12 }}>📄</span>
            <span>{doc.displayName ?? doc.name}</span>
          </div>
        )
      })}
    </div>
  )
}
