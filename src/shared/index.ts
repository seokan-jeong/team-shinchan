/**
 * Team-Seokan 공유 유틸리티
 */

import type { ModelTier, BuiltinAgentName } from '../types';

// ============================================================
// 환경 컨텍스트 생성
// ============================================================

export function createEnvContext(): string {
  const now = new Date();
  return `<env-context>
<date>${now.toISOString().split('T')[0]}</date>
<time>${now.toTimeString().split(' ')[0]}</time>
<timezone>${Intl.DateTimeFormat().resolvedOptions().timeZone}</timezone>
<locale>${Intl.DateTimeFormat().resolvedOptions().locale}</locale>
</env-context>`;
}

// ============================================================
// 에이전트 이름 변환
// ============================================================

export const AGENT_DISPLAY_NAMES: Record<BuiltinAgentName, string> = {
  jjangu: '짱구',
  jjanga: '짱아',
  maenggu: '맹구',
  cheolsu: '철수',
  suji: '수지',
  heukgom: '흑곰',
  hooni: '훈이',
  shinhyungman: '신형만',
  yuri: '유리',
  bongmisun: '봉미선',
  actiongamen: '액션가면',
  heendungi: '흰둥이',
  chaesunga: '채성아',
  namiri: '나미리',
};

export const AGENT_ROLES: Record<BuiltinAgentName, string> = {
  jjangu: 'Orchestrator',
  jjanga: 'Atlas',
  maenggu: 'Executor',
  cheolsu: 'Hephaestus',
  suji: 'Frontend',
  heukgom: 'Backend',
  hooni: 'DevOps',
  shinhyungman: 'Oracle',
  yuri: 'Planner',
  bongmisun: 'Metis',
  actiongamen: 'Reviewer',
  heendungi: 'Explorer',
  chaesunga: 'Librarian',
  namiri: 'Multimodal',
};

export function getAgentDisplayName(name: BuiltinAgentName): string {
  return AGENT_DISPLAY_NAMES[name] || name;
}

export function getAgentRole(name: BuiltinAgentName): string {
  return AGENT_ROLES[name] || 'Unknown';
}

export function formatAgentName(name: BuiltinAgentName): string {
  return `${AGENT_DISPLAY_NAMES[name]} (${AGENT_ROLES[name]})`;
}

// ============================================================
// 모델 관련 유틸리티
// ============================================================

export function getModelDisplayName(model: ModelTier): string {
  const names: Record<ModelTier, string> = {
    opus: 'Claude Opus',
    sonnet: 'Claude Sonnet',
    haiku: 'Claude Haiku',
  };
  return names[model];
}

export function isExpensiveModel(model: ModelTier): boolean {
  return model === 'opus';
}

export function isCheapModel(model: ModelTier): boolean {
  return model === 'haiku';
}

// ============================================================
// 문자열 유틸리티
// ============================================================

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function stripXmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

// ============================================================
// 키워드 매칭
// ============================================================

export function matchKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

export function findMatchedKeyword(text: string, keywords: string[]): string | undefined {
  const lowerText = text.toLowerCase();
  return keywords.find((keyword) => lowerText.includes(keyword.toLowerCase()));
}

// ============================================================
// 배열 유틸리티
// ============================================================

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// ============================================================
// 로깅 유틸리티
// ============================================================

export function log(category: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Team-Seokan:${category}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function logError(category: string, message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Team-Seokan:${category}] ERROR: ${message}`);
  if (error) {
    console.error(error);
  }
}

export function logWarning(category: string, message: string): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [Team-Seokan:${category}] WARNING: ${message}`);
}

// ============================================================
// 타이밍 유틸리티
// ============================================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function measureTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.then((r) => ({
      result: r,
      duration: Date.now() - start,
    }));
  }

  return Promise.resolve({
    result,
    duration: Date.now() - start,
  });
}
