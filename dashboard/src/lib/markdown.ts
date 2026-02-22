/**
 * markdown.ts
 *
 * Lightweight markdown parser ported from app.js (lines 1000-1200).
 * XSS-safe: all user content is HTML-escaped before markdown patterns are applied.
 *
 * Supports: h1-h6, ul/ol, task checkboxes, tables, code blocks,
 * horizontal rules, bold, italic, inline code, YAML frontmatter.
 */

// ── HTML escape (XSS prevention) ─────────────────────────────────────────────

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── YAML frontmatter extraction ───────────────────────────────────────────────

export interface FrontmatterResult {
  frontmatter: string | null
  body: string
}

export function extractFrontmatter(mdText: string): FrontmatterResult {
  const match = mdText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (match) {
    return { frontmatter: match[1].trim(), body: match[2] }
  }
  return { frontmatter: null, body: mdText }
}

// ── Inline markdown ───────────────────────────────────────────────────────────

function inlineMarkdown(escapedText: string): string {
  return escapedText
    // **bold** or __bold__
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a || b}</strong>`)
    // *italic* or _italic_
    .replace(/\*(.+?)\*|_(.+?)_/g, (_, a, b) => `<em>${a || b}</em>`)
    // `inline code`
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
}

// ── Table parser ──────────────────────────────────────────────────────────────

function parseTable(lines: string[]): string {
  if (lines.length < 2) {
    return `<p>${escapeHtml(lines.join('\n'))}</p>`
  }

  const isSeparator = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l)

  const headerLine = lines[0]
  const hasHeader = lines.length >= 2 && isSeparator(lines[1])

  const parseRow = (rowLine: string): string[] => {
    return rowLine
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cell.trim())
  }

  let html = '<table>'

  if (hasHeader) {
    const headers = parseRow(headerLine)
    html += '<thead><tr>'
    headers.forEach((h) => {
      html += `<th>${inlineMarkdown(escapeHtml(h))}</th>`
    })
    html += '</tr></thead>'
    html += '<tbody>'
    for (let j = 2; j < lines.length; j++) {
      if (isSeparator(lines[j])) continue
      const cells = parseRow(lines[j])
      html += '<tr>'
      cells.forEach((c) => {
        html += `<td>${inlineMarkdown(escapeHtml(c))}</td>`
      })
      html += '</tr>'
    }
    html += '</tbody>'
  } else {
    html += '<tbody>'
    lines.forEach((l) => {
      if (isSeparator(l)) return
      const cells = parseRow(l)
      html += '<tr>'
      cells.forEach((c) => {
        html += `<td>${inlineMarkdown(escapeHtml(c))}</td>`
      })
      html += '</tr>'
    })
    html += '</tbody>'
  }

  html += '</table>'
  return html
}

// ── Body parser ───────────────────────────────────────────────────────────────

function parseMarkdownBody(text: string): string {
  const lines = text.split('\n')
  let result = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block (``` ... ```)
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      result += `<pre><code${lang ? ` class="lang-${escapeHtml(lang)}"` : ''}>${codeLines.join('\n')}</code></pre>`
      i++
      continue
    }

    // Horizontal rule (--- or ***)
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      result += '<hr>'
      i++
      continue
    }

    // Headings (# ~ ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = inlineMarkdown(escapeHtml(headingMatch[2]))
      result += `<h${level}>${content}</h${level}>`
      i++
      continue
    }

    // Table (| col | col |)
    if (line.includes('|') && line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      result += parseTable(tableLines)
      continue
    }

    // Unordered list (- item or * item) with optional checkboxes
    const listMatch = line.match(/^(\s*)[-*+]\s+(.*)$/)
    if (listMatch) {
      result += '<ul>'
      while (i < lines.length) {
        const lm = lines[i].match(/^(\s*)[-*+]\s+(.*)$/)
        if (!lm) break
        const itemContent = lm[2]
        const checkboxMatch = itemContent.match(/^\[([ xX])\]\s+(.*)$/)
        if (checkboxMatch) {
          const checked = checkboxMatch[1].toLowerCase() === 'x'
          const label = inlineMarkdown(escapeHtml(checkboxMatch[2]))
          result += `<li class="task-list-item"><input type="checkbox" class="task-checkbox"${checked ? ' checked' : ''} disabled><span>${label}</span></li>`
        } else {
          result += `<li>${inlineMarkdown(escapeHtml(itemContent))}</li>`
        }
        i++
      }
      result += '</ul>'
      continue
    }

    // Ordered list (1. item)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/)
    if (olMatch) {
      result += '<ol>'
      while (i < lines.length) {
        const om = lines[i].match(/^(\s*)\d+\.\s+(.*)$/)
        if (!om) break
        result += `<li>${inlineMarkdown(escapeHtml(om[2]))}</li>`
        i++
      }
      result += '</ol>'
      continue
    }

    // Empty line
    if (line.trim() === '') {
      result += '<p></p>'
      i++
      continue
    }

    // Plain paragraph
    result += `<p>${inlineMarkdown(escapeHtml(line))}</p>`
    i++
  }

  return result
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render markdown text to HTML string.
 * YAML frontmatter is NOT processed here — use extractFrontmatter() separately.
 */
export function renderMarkdown(mdText: string): string {
  if (!mdText) return ''
  return parseMarkdownBody(mdText)
}
