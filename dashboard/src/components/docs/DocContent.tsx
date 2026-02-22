/**
 * DocContent.tsx
 *
 * Main content area for the docs viewer.
 * Mirrors app.js _renderDocContent() / loadDocContent() (lines 1278-1330).
 *
 * - Loads file content from GET /api/docs/:filename
 * - Extracts YAML frontmatter and renders it as a key:value table
 * - Renders markdown body using the lightweight renderMarkdown() utility
 * - Auto-refreshes when SSE doc_updated event clears docs.content
 */
import { useEffect } from 'react'
import { useDashboardStore } from '../../stores/dashboard-store'
import { extractFrontmatter, renderMarkdown, escapeHtml } from '../../lib/markdown'

// ── Frontmatter renderer ──────────────────────────────────────────────────────

function parseFrontmatterEntries(
  raw: string,
): Array<{ key: string; value: string }> {
  return raw
    .split('\n')
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx === -1) return null
      return {
        key: line.slice(0, idx).trim(),
        value: line.slice(idx + 1).trim(),
      }
    })
    .filter((e): e is { key: string; value: string } => e !== null && e.key.length > 0)
}

interface DocContentProps {
  filename: string | null
}

export function DocContent({ filename }: DocContentProps) {
  const docs = useDashboardStore((s) => s.docs)
  const setDocs = useDashboardStore((s) => s.setDocs)

  // Load content when filename changes or content is cleared (doc_updated)
  useEffect(() => {
    if (!filename) return

    let cancelled = false

    async function load() {
      setDocs({ loading: true, content: null })
      try {
        const res = await fetch(`/api/docs/${encodeURIComponent(filename!)}`)
        if (cancelled) return
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { message?: string }
          if (!cancelled) {
            setDocs({
              loading: false,
              content: `__ERROR__:${errData.message ?? '파일을 불러올 수 없습니다'}`,
            })
          }
          return
        }
        const data = await res.json() as {
          filename: string
          content: string
          lastModified?: string
        }
        if (!cancelled) {
          setDocs({
            loading: false,
            content: data.content ?? '',
            currentFile: data.filename,
            files: docs.files,
          })
        }
      } catch {
        if (!cancelled) {
          setDocs({ loading: false, content: '__ERROR__:서버 연결 실패' })
        }
      }
    }

    // Reload if content was cleared by doc_updated event or on new filename
    if (docs.content === null || docs.currentFile !== filename) {
      load()
    }

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, docs.content === null])

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!filename) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: 'var(--muted-foreground)',
          textAlign: 'center',
          padding: 40,
        }}
      >
        <span style={{ fontSize: 48, opacity: 0.4 }}>📄</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>파일을 선택하세요</span>
        <span style={{ fontSize: 12, opacity: 0.6, maxWidth: 280, lineHeight: 1.5 }}>
          좌측 목록에서 문서를 클릭하면 여기에 표시됩니다
        </span>
      </div>
    )
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (docs.loading && docs.content === null) {
    return (
      <div style={{ padding: 20, color: 'var(--muted-foreground)', fontSize: 12 }}>
        로딩 중...
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (docs.content?.startsWith('__ERROR__:')) {
    const msg = docs.content.slice('__ERROR__:'.length)
    return (
      <div style={{ padding: 20, color: 'var(--destructive)', fontSize: 13 }}>
        오류: {msg}
      </div>
    )
  }

  // ── Content state ──────────────────────────────────────────────────────────
  const rawContent = docs.content ?? ''
  const { frontmatter, body } = extractFrontmatter(rawContent)
  const renderedBody = renderMarkdown(body)

  const fmEntries = frontmatter ? parseFrontmatterEntries(frontmatter) : []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable content area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}
      >
        {/* Meta header: filename + modified time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--foreground)',
            }}
          >
            📄 {escapeHtml(filename)}
          </span>
          {docs.currentFile === filename && (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
              {/* Modified time is stored per-load; shown via data attr trick is not needed */}
            </span>
          )}
        </div>

        {/* YAML frontmatter table */}
        {fmEntries.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              background: 'rgba(88,166,255,0.05)',
              border: '1px solid rgba(88,166,255,0.15)',
              borderRadius: 6,
              padding: '10px 14px',
              fontSize: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'var(--muted-foreground)',
                marginBottom: 8,
              }}
            >
              Frontmatter
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {fmEntries.map(({ key, value }) => (
                  <tr key={key}>
                    <td
                      style={{
                        padding: '3px 8px 3px 0',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        verticalAlign: 'top',
                        fontSize: 11,
                      }}
                    >
                      {key}
                    </td>
                    <td
                      style={{
                        padding: '3px 0',
                        color: 'var(--muted-foreground)',
                        fontSize: 11,
                        wordBreak: 'break-word',
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Markdown body */}
        <div
          className="md-content"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />
      </div>
    </div>
  )
}
