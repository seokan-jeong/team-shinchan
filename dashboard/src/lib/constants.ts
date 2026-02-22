export const AGENTS = {
  shinnosuke:  { emoji: '👦', name: 'Shinnosuke',   role: 'Orchestrator',     layer: 'Orchestration', model: 'opus' },
  himawari:    { emoji: '🌸', name: 'Himawari',     role: 'Atlas',            layer: 'Orchestration', model: 'opus' },
  midori:      { emoji: '🌻', name: 'Midori',       role: 'Debate Moderator', layer: 'Orchestration', model: 'sonnet' },
  bo:          { emoji: '😪', name: 'Bo',           role: 'Task Executor',    layer: 'Execution',     model: 'sonnet' },
  kazama:      { emoji: '🎩', name: 'Kazama',       role: 'Deep Worker',      layer: 'Execution',     model: 'opus' },
  aichan:      { emoji: '🎀', name: 'Aichan',       role: 'Frontend',         layer: 'Specialist',    model: 'sonnet' },
  bunta:       { emoji: '🍜', name: 'Bunta',        role: 'Backend',          layer: 'Specialist',    model: 'sonnet' },
  masao:       { emoji: '🍙', name: 'Masao',        role: 'DevOps',           layer: 'Specialist',    model: 'sonnet' },
  hiroshi:     { emoji: '👔', name: 'Hiroshi',      role: 'Oracle',           layer: 'Advisory',      model: 'opus' },
  nene:        { emoji: '📋', name: 'Nene',         role: 'Planner',          layer: 'Advisory',      model: 'opus' },
  misae:       { emoji: '👩', name: 'Misae',        role: 'Pre-Planning',     layer: 'Advisory',      model: 'sonnet' },
  actionkamen: { emoji: '🦸', name: 'Action Kamen', role: 'Reviewer',         layer: 'Advisory',      model: 'opus' },
  shiro:       { emoji: '🐶', name: 'Shiro',        role: 'Explorer',         layer: 'Utility',       model: 'haiku' },
  masumi:      { emoji: '📚', name: 'Masumi',       role: 'Librarian',        layer: 'Utility',       model: 'sonnet' },
  ume:         { emoji: '🖼️', name: 'Ume',          role: 'Multimodal',       layer: 'Utility',       model: 'sonnet' },
} as const

export type AgentId = keyof typeof AGENTS

export const LAYER_ORDER = [
  'Orchestration',
  'Execution',
  'Specialist',
  'Advisory',
  'Utility',
] as const

export const STAGES = [
  { id: 'requirements', label: 'Requirements', num: 1 },
  { id: 'planning',     label: 'Planning',     num: 2 },
  { id: 'execution',    label: 'Execution',    num: 3 },
  { id: 'completion',   label: 'Completion',   num: 4 },
] as const

export type StageId = typeof STAGES[number]['id']

/** Color map for agent status badges */
export const STATUS_COLORS = {
  working:    'text-[var(--primary)]',
  delegating: 'text-[var(--warning)]',
  receiving:  'text-[var(--success)]',
  idle:       'text-[var(--muted-foreground)]',
  completed:  'text-[var(--success)]',
} as const

/** Layer badge colors */
export const LAYER_COLORS: Record<string, string> = {
  Orchestration: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  Execution:     'bg-blue-900/40 text-blue-300 border-blue-700/50',
  Specialist:    'bg-green-900/40 text-green-300 border-green-700/50',
  Advisory:      'bg-amber-900/40 text-amber-300 border-amber-700/50',
  Utility:       'bg-gray-800/60 text-gray-300 border-gray-600/50',
}
