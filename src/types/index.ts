// Team-Seokan 타입 정의

// ============================================================
// 에이전트 타입
// ============================================================

export type AgentCategory = 'orchestration' | 'execution' | 'specialist' | 'advisor' | 'exploration' | 'utility';

export type AgentCost = 'FREE' | 'CHEAP' | 'EXPENSIVE';

export type ModelTier = 'opus' | 'sonnet' | 'haiku';

export type BuiltinAgentName =
  | 'jjangu'      // 짱구 (Orchestrator)
  | 'jjanga'      // 짱아 (Atlas)
  | 'maenggu'     // 맹구 (Executor)
  | 'cheolsu'     // 철수 (Hephaestus)
  | 'suji'        // 수지 (Frontend)
  | 'heukgom'     // 흑곰 (Backend)
  | 'hooni'       // 훈이 (DevOps)
  | 'shinhyungman' // 신형만 (Oracle)
  | 'yuri'        // 유리 (Planner)
  | 'bongmisun'   // 봉미선 (Metis)
  | 'actiongamen' // 액션가면 (Reviewer)
  | 'heendungi'   // 흰둥이 (Explorer)
  | 'chaesunga'   // 채성아 (Librarian)
  | 'namiri';     // 나미리 (Multimodal)

export interface AgentPromptMetadata {
  name: BuiltinAgentName;
  displayName: string;
  character: string;
  role: string;
  category: AgentCategory;
  cost: AgentCost;
  model: ModelTier;
  description: string;
  delegationTriggers: string[];
  allowedTools?: string[];
  disallowedTools?: string[];
  isReadOnly: boolean;
}

export interface AgentConfig {
  name: BuiltinAgentName;
  systemPrompt: string;
  metadata: AgentPromptMetadata;
  overrides?: AgentOverrideConfig;
}

export interface AgentOverrideConfig {
  model?: ModelTier;
  promptAppend?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  disabled?: boolean;
}

// ============================================================
// 훅 타입
// ============================================================

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SessionStart'
  | 'SessionEnd'
  | 'onSummarize'
  | 'chat.message'
  | 'tool.execute.before'
  | 'tool.execute.after'
  | 'event';

export interface HookConfig {
  name: string;
  event: HookEvent;
  description: string;
  enabled: boolean;
  priority: number;
  matchTools?: string[];
  handler: HookHandler;
}

export type HookHandler = (context: HookContext) => Promise<HookResult>;

export interface HookContext {
  event: HookEvent;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  message?: string;
  todos?: TodoItem[];
  sessionState?: SessionState;
}

export interface HookResult {
  continue: boolean;
  modified?: boolean;
  message?: string;
  inject?: string;
}

// ============================================================
// 도구 타입
// ============================================================

export interface ToolConfig {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: ToolHandler;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

// ============================================================
// 스킬 타입
// ============================================================

export interface SkillConfig {
  name: string;
  displayName: string;
  description: string;
  triggers: string[];
  autoActivate: boolean;
  handler: SkillHandler;
}

export type SkillHandler = (context: SkillContext) => Promise<SkillResult>;

export interface SkillContext {
  args?: string;
  message: string;
  sessionState: SessionState;
}

export interface SkillResult {
  success: boolean;
  output?: string;
  inject?: string;
}

// ============================================================
// 상태 타입
// ============================================================

export interface SessionState {
  sessionId: string;
  startTime: Date;
  messageCount: number;
  contextUsage: number;
  activeAgent?: BuiltinAgentName;
  activeSkill?: string;
  ralphLoopActive: boolean;
  ultraworkActive: boolean;
  autopilotActive: boolean;
  todos: TodoItem[];
  backgroundTasks: BackgroundTask[];
}

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface BackgroundTask {
  id: string;
  agentName: BuiltinAgentName;
  description: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  result?: unknown;
}

// ============================================================
// 플러그인 설정 타입
// ============================================================

export interface PluginSettings {
  defaultModel: ModelTier;
  maxConcurrentAgents: number;
  maxRetries: number;
  contextWarningThreshold: number;
  enableRalphLoop: boolean;
  enableTodoEnforcer: boolean;
  enableIntentGate: boolean;
  enableReviewerCheck: boolean;
  language: 'ko' | 'en';
  agentOverrides?: Record<BuiltinAgentName, AgentOverrideConfig>;
  disabledHooks?: string[];
  disabledSkills?: string[];
}

export interface PluginContext {
  settings: PluginSettings;
  sessionState: SessionState;
  agents: Map<BuiltinAgentName, AgentConfig>;
  hooks: Map<string, HookConfig>;
  tools: Map<string, ToolConfig>;
  skills: Map<string, SkillConfig>;
}

// ============================================================
// 이벤트 타입
// ============================================================

export interface PluginEvent {
  type: 'session.created' | 'session.deleted' | 'error' | 'notification';
  payload: unknown;
  timestamp: Date;
}

export interface DelegationRequest {
  targetAgent: BuiltinAgentName;
  task: string;
  context?: string;
  runInBackground?: boolean;
  waitForResult?: boolean;
}

export interface DelegationResult {
  success: boolean;
  agentName: BuiltinAgentName;
  output?: string;
  error?: string;
  duration?: number;
}
