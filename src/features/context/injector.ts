/**
 * Context Injector
 * 에이전트 프롬프트에 메모리 주입
 */

import type {
  MemoryEntry,
  MemoryOwner,
  MemoryCategory,
  ContextInjection,
  MemorySummary,
} from '../memory/types';
import { getMemoryManager } from '../memory/manager';
import { calculateRelevanceScore } from '../memory/search';
import { calculateEffectiveConfidence } from '../memory/decay';

/**
 * 컨텍스트 주입 옵션
 */
export interface InjectionOptions {
  /** 대상 에이전트 */
  agent: MemoryOwner;

  /** 현재 작업 설명 */
  currentTask?: string;

  /** 관련 키워드 */
  keywords?: string[];

  /** 최대 토큰 수 */
  maxTokens?: number;

  /** 포함할 카테고리 (기본: 전체) */
  includeCategories?: MemoryCategory[];

  /** 제외할 카테고리 */
  excludeCategories?: MemoryCategory[];

  /** 최소 신뢰도 */
  minConfidence?: number;

  /** 상세 메모리 포함 여부 */
  includeDetails?: boolean;
}

/**
 * 기본 옵션
 */
const DEFAULT_OPTIONS: Required<Omit<InjectionOptions, 'agent'>> = {
  currentTask: '',
  keywords: [],
  maxTokens: 500,
  includeCategories: [],
  excludeCategories: [],
  minConfidence: 0.3,
  includeDetails: false,
};

/**
 * 토큰 수 추정 (문자 기반)
 */
function estimateTokens(text: string): number {
  // 한글은 대략 1.5토큰/글자, 영어는 0.25토큰/글자
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const otherChars = text.length - koreanChars;

  return Math.ceil(koreanChars * 1.5 + otherChars * 0.25);
}

/**
 * 메모리 필터링
 */
function filterMemories(
  memories: MemoryEntry[],
  options: Required<Omit<InjectionOptions, 'agent'>> & { agent: MemoryOwner }
): MemoryEntry[] {
  return memories.filter((memory) => {
    // 신뢰도 필터
    const confidence = calculateEffectiveConfidence(memory);
    if (confidence < options.minConfidence) {
      return false;
    }

    // 카테고리 포함 필터
    if (options.includeCategories.length > 0) {
      if (!options.includeCategories.includes(memory.category)) {
        return false;
      }
    }

    // 카테고리 제외 필터
    if (options.excludeCategories.length > 0) {
      if (options.excludeCategories.includes(memory.category)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 관련성 기반 메모리 정렬
 */
function rankMemories(
  memories: MemoryEntry[],
  options: Required<Omit<InjectionOptions, 'agent'>> & { agent: MemoryOwner }
): MemoryEntry[] {
  const scores = new Map<string, number>();

  for (const memory of memories) {
    let score = calculateRelevanceScore(memory, {
      keywords: options.keywords,
      currentTask: options.currentTask,
      currentAgent: options.agent,
    });

    // 에이전트 전용 메모리 보너스
    if (memory.owner === options.agent) {
      score *= 1.5;
    }

    // 공유 메모리는 약간 낮게
    if (memory.owner === 'shared') {
      score *= 0.9;
    }

    scores.set(memory.id, score);
  }

  return memories.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
}

/**
 * 메모리를 요약 텍스트로 변환
 */
function memoryToSummaryLine(memory: MemoryEntry): string {
  const confidence = calculateEffectiveConfidence(memory);
  const confidenceStr = confidence >= 0.8 ? '⭐' : confidence >= 0.5 ? '○' : '·';

  return `${confidenceStr} [${memory.category}] ${memory.title}: ${memory.content.slice(0, 80)}${memory.content.length > 80 ? '...' : ''}`;
}

/**
 * 요약 생성
 */
function generateSummary(
  memories: MemoryEntry[],
  maxTokens: number
): { text: string; includedIds: string[]; tokens: number } {
  const lines: string[] = [];
  const includedIds: string[] = [];
  let currentTokens = 0;

  // 헤더
  const header = '## 학습된 컨텍스트\n';
  currentTokens += estimateTokens(header);

  for (const memory of memories) {
    const line = memoryToSummaryLine(memory);
    const lineTokens = estimateTokens(line + '\n');

    if (currentTokens + lineTokens > maxTokens) {
      break;
    }

    lines.push(line);
    includedIds.push(memory.id);
    currentTokens += lineTokens;
  }

  return {
    text: header + lines.join('\n'),
    includedIds,
    tokens: currentTokens,
  };
}

/**
 * 컨텍스트 주입 생성
 */
export async function generateContextInjection(
  options: InjectionOptions
): Promise<ContextInjection> {
  const fullOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const manager = getMemoryManager();
  await manager.loadMemories();

  // 모든 메모리 가져오기
  let memories = manager.getAllMemories();

  // 필터링
  memories = filterMemories(memories, fullOptions);

  // 관련성 기반 정렬
  memories = rankMemories(memories, fullOptions);

  // 요약 생성
  const { text, includedIds, tokens } = generateSummary(memories, fullOptions.maxTokens);

  // 상세 메모리 (옵션)
  const details = fullOptions.includeDetails
    ? memories.filter((m) => includedIds.includes(m.id))
    : [];

  // 포함된 카테고리
  const includedCategories = [
    ...new Set(
      memories
        .filter((m) => includedIds.includes(m.id))
        .map((m) => m.category)
    ),
  ];

  return {
    summary: text,
    details,
    totalTokens: tokens,
    includedCategories,
  };
}

/**
 * 에이전트별 최적화된 컨텍스트 생성
 */
export async function generateAgentContext(
  agent: MemoryOwner,
  task: string
): Promise<string> {
  // 에이전트별 기본 카테고리 설정
  const agentCategories: Partial<Record<MemoryOwner, MemoryCategory[]>> = {
    maenggu: ['pattern', 'convention', 'mistake'],
    suji: ['preference', 'convention', 'context'],
    heukgom: ['context', 'decision', 'pattern'],
    shinhyungman: ['insight', 'decision', 'mistake'],
    yuri: ['decision', 'context', 'pattern'],
    actiongamen: ['mistake', 'convention', 'insight'],
  };

  const injection = await generateContextInjection({
    agent,
    currentTask: task,
    keywords: extractKeywords(task),
    includeCategories: agentCategories[agent] || [],
    maxTokens: 400,
  });

  if (injection.summary.trim() === '## 학습된 컨텍스트') {
    return ''; // 메모리 없음
  }

  return `
<learned-context>
${injection.summary}
</learned-context>
`;
}

/**
 * 키워드 추출
 */
function extractKeywords(text: string): string[] {
  // 불용어 제거
  const stopWords = new Set([
    '이', '그', '저', '것', '를', '을', '에', '의', '가', '는', '은', '와', '과',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'this', 'that',
  ]);

  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return [...new Set(words)].slice(0, 10);
}

/**
 * 프롬프트에 컨텍스트 삽입
 */
export function injectContextIntoPrompt(
  originalPrompt: string,
  context: string,
  position: 'start' | 'end' | 'after-system' = 'after-system'
): string {
  if (!context.trim()) {
    return originalPrompt;
  }

  switch (position) {
    case 'start':
      return context + '\n\n' + originalPrompt;

    case 'end':
      return originalPrompt + '\n\n' + context;

    case 'after-system':
      // 시스템 프롬프트 직후에 삽입
      const systemEndMarkers = ['</system>', '---', '\n\n'];

      for (const marker of systemEndMarkers) {
        const index = originalPrompt.indexOf(marker);
        if (index !== -1) {
          const insertPoint = index + marker.length;
          return (
            originalPrompt.slice(0, insertPoint) +
            '\n\n' +
            context +
            '\n\n' +
            originalPrompt.slice(insertPoint)
          );
        }
      }

      // 마커를 찾지 못하면 시작에 삽입
      return context + '\n\n' + originalPrompt;

    default:
      return originalPrompt;
  }
}

/**
 * 캐시된 컨텍스트 관리
 */
class ContextCache {
  private cache = new Map<string, { context: string; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5분

  get(agent: MemoryOwner, taskHash: string): string | null {
    const key = `${agent}:${taskHash}`;
    const entry = this.cache.get(key);

    if (entry && Date.now() - entry.timestamp < this.ttl) {
      return entry.context;
    }

    return null;
  }

  set(agent: MemoryOwner, taskHash: string, context: string): void {
    const key = `${agent}:${taskHash}`;
    this.cache.set(key, { context, timestamp: Date.now() });
  }

  invalidate(): void {
    this.cache.clear();
  }
}

export const contextCache = new ContextCache();

/**
 * 캐시된 컨텍스트 생성
 */
export async function getCachedAgentContext(
  agent: MemoryOwner,
  task: string
): Promise<string> {
  const taskHash = simpleHash(task);
  const cached = contextCache.get(agent, taskHash);

  if (cached !== null) {
    return cached;
  }

  const context = await generateAgentContext(agent, task);
  contextCache.set(agent, taskHash, context);

  return context;
}

/**
 * 간단한 해시 함수
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
