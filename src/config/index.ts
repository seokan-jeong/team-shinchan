/**
 * Team-Seokan 설정 시스템
 */

import type { PluginSettings, ModelTier, BuiltinAgentName, AgentOverrideConfig } from '../types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================
// 기본 설정
// ============================================================

export function createDefaultSettings(): PluginSettings {
  return {
    defaultModel: 'sonnet',
    maxConcurrentAgents: 5,
    maxRetries: 3,
    contextWarningThreshold: 50,
    enableRalphLoop: true,
    enableTodoEnforcer: true,
    enableIntentGate: true,
    enableReviewerCheck: true,
    language: 'ko',
    agentOverrides: undefined,
    disabledHooks: [],
    disabledSkills: [],
  };
}

// ============================================================
// 설정 로드
// ============================================================

export async function loadPluginConfig(): Promise<PluginSettings> {
  const defaultSettings = createDefaultSettings();

  // 설정 파일 경로들
  const configPaths = [
    join(process.cwd(), '.team-seokan', 'config.json'),
    join(process.cwd(), 'team-seokan.config.json'),
    join(homedir(), '.config', 'team-seokan', 'config.json'),
  ];

  for (const configPath of configPaths) {
    try {
      const content = await readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(content) as Partial<PluginSettings>;
      return mergeSettings(defaultSettings, userConfig);
    } catch {
      // 파일이 없으면 다음 경로 시도
      continue;
    }
  }

  return defaultSettings;
}

// ============================================================
// 설정 병합
// ============================================================

function mergeSettings(
  defaults: PluginSettings,
  overrides: Partial<PluginSettings>
): PluginSettings {
  // agentOverrides 병합 (undefined 허용)
  const mergedAgentOverrides = overrides.agentOverrides
    ? { ...defaults.agentOverrides, ...overrides.agentOverrides }
    : defaults.agentOverrides;

  return {
    ...defaults,
    ...overrides,
    agentOverrides: mergedAgentOverrides,
    disabledHooks: [
      ...(defaults.disabledHooks || []),
      ...(overrides.disabledHooks || []),
    ],
    disabledSkills: [
      ...(defaults.disabledSkills || []),
      ...(overrides.disabledSkills || []),
    ],
  };
}

// ============================================================
// 에이전트별 모델 설정
// ============================================================

export const AGENT_MODEL_MAP: Record<BuiltinAgentName, ModelTier> = {
  // 오케스트레이션 (Opus)
  jjangu: 'opus',
  jjanga: 'opus',

  // 실행 (Sonnet/Opus)
  maenggu: 'sonnet',
  cheolsu: 'opus',

  // 전문가 (Sonnet)
  suji: 'sonnet',
  heukgom: 'sonnet',
  hooni: 'sonnet',

  // 조언/계획 (Opus/Sonnet)
  shinhyungman: 'opus',
  yuri: 'opus',
  bongmisun: 'sonnet',
  actiongamen: 'opus',

  // 탐색/유틸리티 (Haiku/Sonnet)
  heendungi: 'haiku',
  chaesunga: 'sonnet',
  namiri: 'sonnet',
};

// ============================================================
// 읽기 전용 에이전트 목록
// ============================================================

export const READ_ONLY_AGENTS: BuiltinAgentName[] = [
  'shinhyungman',  // Oracle
  'yuri',          // Planner
  'bongmisun',     // Metis
  'actiongamen',   // Reviewer
  'heendungi',     // Explorer
  'chaesunga',     // Librarian
];

// ============================================================
// 에이전트 카테고리
// ============================================================

export const AGENT_CATEGORIES = {
  orchestration: ['jjangu', 'jjanga'],
  execution: ['maenggu', 'cheolsu'],
  specialist: ['suji', 'heukgom', 'hooni'],
  advisor: ['shinhyungman', 'yuri', 'bongmisun', 'actiongamen'],
  exploration: ['heendungi', 'chaesunga'],
  utility: ['namiri'],
} as const;

// ============================================================
// 스킬 트리거 키워드
// ============================================================

export const SKILL_TRIGGERS = {
  ultrawork: ['ulw', 'ultrawork', '병렬', '빠르게', 'parallel'],
  ralph: ['ralph', '끝까지', '완료할 때까지', 'dont stop', "don't stop"],
  autopilot: ['autopilot', '자동으로', '알아서', 'auto'],
  plan: ['plan', '계획', '설계', 'planning'],
  analyze: ['analyze', '분석', '디버깅', '왜 안', 'debug', 'investigate'],
  deepsearch: ['deepsearch', '깊은검색', '찾아줘', 'search'],
  'git-master': ['commit', 'push', 'merge', 'rebase', 'git'],
  'frontend-ui-ux': ['UI', 'UX', '컴포넌트', '스타일', 'CSS', 'component'],
  cancel: ['cancel', '취소', '중단', 'stop', '멈춰'],
} as const;
