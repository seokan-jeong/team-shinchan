/**
 * Memory Search
 * 메모리 검색 및 관련성 계산
 */

import type { MemoryEntry, MemoryQuery, MemorySearchResult, MemoryCategory } from './types';
import { calculateEffectiveConfidence } from './decay';

/**
 * 키워드 매칭 점수 계산
 */
function calculateKeywordScore(memory: MemoryEntry, keyword: string): number {
  const lowerKeyword = keyword.toLowerCase();
  let score = 0;

  // 제목 매칭 (가중치 높음)
  if (memory.title.toLowerCase().includes(lowerKeyword)) {
    score += 3;
  }

  // 내용 매칭
  const contentLower = memory.content.toLowerCase();
  const contentMatches = (contentLower.match(new RegExp(lowerKeyword, 'g')) || []).length;
  score += Math.min(contentMatches, 5); // 최대 5점

  // 태그 매칭 (정확히 일치)
  if (memory.tags.some((tag) => tag.toLowerCase() === lowerKeyword)) {
    score += 4;
  }

  // 태그 부분 매칭
  if (memory.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))) {
    score += 2;
  }

  return score;
}

/**
 * 날짜 필터링
 */
function isWithinDays(memory: MemoryEntry, days: number): boolean {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return memory.updatedAt >= cutoff;
}

/**
 * 메모리 필터링
 */
export function filterMemories(memories: MemoryEntry[], query: MemoryQuery): MemoryEntry[] {
  return memories.filter((memory) => {
    // 카테고리 필터
    if (query.categories && query.categories.length > 0) {
      if (!query.categories.includes(memory.category)) {
        return false;
      }
    }

    // 스코프 필터
    if (query.scope && memory.scope !== query.scope) {
      return false;
    }

    // 소유자 필터
    if (query.owner && memory.owner !== query.owner) {
      return false;
    }

    // 최소 신뢰도 필터
    if (query.minConfidence !== undefined) {
      const effectiveConfidence = calculateEffectiveConfidence(memory);
      if (effectiveConfidence < query.minConfidence) {
        return false;
      }
    }

    // 태그 필터 (AND 조건)
    if (query.tags && query.tags.length > 0) {
      const memoryTagsLower = memory.tags.map((t) => t.toLowerCase());
      const hasAllTags = query.tags.every((tag) =>
        memoryTagsLower.includes(tag.toLowerCase())
      );
      if (!hasAllTags) {
        return false;
      }
    }

    // 날짜 필터
    if (query.withinDays !== undefined) {
      if (!isWithinDays(memory, query.withinDays)) {
        return false;
      }
    }

    // 키워드 필터
    if (query.keyword) {
      const score = calculateKeywordScore(memory, query.keyword);
      if (score === 0) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 관련성 점수 계산
 */
export function calculateRelevanceScore(
  memory: MemoryEntry,
  context: {
    keywords?: string[];
    currentTask?: string;
    currentAgent?: string;
    recentTags?: string[];
  }
): number {
  let score = 0;

  // 기본 신뢰도 점수
  const effectiveConfidence = calculateEffectiveConfidence(memory);
  score += effectiveConfidence * 10;

  // 키워드 매칭
  if (context.keywords) {
    for (const keyword of context.keywords) {
      score += calculateKeywordScore(memory, keyword) * 2;
    }
  }

  // 현재 작업과의 관련성
  if (context.currentTask) {
    const taskWords = context.currentTask.toLowerCase().split(/\s+/);
    for (const word of taskWords) {
      if (word.length > 2) {
        // 짧은 단어 무시
        score += calculateKeywordScore(memory, word) * 0.5;
      }
    }
  }

  // 에이전트 매칭
  if (context.currentAgent && memory.owner === context.currentAgent) {
    score += 5;
  }

  // 최근 태그 매칭
  if (context.recentTags) {
    const matchingTags = memory.tags.filter((tag) =>
      context.recentTags!.some((rt) => rt.toLowerCase() === tag.toLowerCase())
    );
    score += matchingTags.length * 3;
  }

  // 최근 접근 보너스
  const daysSinceAccess = Math.floor(
    (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceAccess < 7) {
    score += (7 - daysSinceAccess) * 0.5;
  }

  // 강화 횟수 보너스
  score += Math.min(memory.reinforcementCount, 10) * 0.5;

  return score;
}

/**
 * 메모리 정렬
 */
export function sortMemories(
  memories: MemoryEntry[],
  sortBy: MemoryQuery['sortBy'] = 'relevance',
  sortOrder: MemoryQuery['sortOrder'] = 'desc',
  relevanceScores?: Map<string, number>
): MemoryEntry[] {
  const sorted = [...memories].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'confidence':
        comparison = calculateEffectiveConfidence(a) - calculateEffectiveConfidence(b);
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'updatedAt':
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case 'accessCount':
        comparison = a.accessCount - b.accessCount;
        break;
      case 'relevance':
      default:
        if (relevanceScores) {
          comparison = (relevanceScores.get(a.id) || 0) - (relevanceScores.get(b.id) || 0);
        } else {
          comparison = calculateEffectiveConfidence(a) - calculateEffectiveConfidence(b);
        }
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * 메모리 검색
 */
export function searchMemories(
  memories: MemoryEntry[],
  query: MemoryQuery,
  context?: {
    keywords?: string[];
    currentTask?: string;
    currentAgent?: string;
    recentTags?: string[];
  }
): MemorySearchResult {
  // 필터링
  let filtered = filterMemories(memories, query);

  // 관련성 점수 계산
  const scores = new Map<string, number>();
  for (const memory of filtered) {
    const score = calculateRelevanceScore(memory, context || {});
    scores.set(memory.id, score);
  }

  // 정렬
  const sorted = sortMemories(filtered, query.sortBy, query.sortOrder, scores);

  // 페이지네이션
  const offset = query.offset || 0;
  const limit = query.limit || sorted.length;
  const paginated = sorted.slice(offset, offset + limit);

  return {
    memories: paginated,
    total: filtered.length,
    scores,
  };
}

/**
 * 유사 메모리 찾기
 */
export function findSimilarMemories(
  targetMemory: MemoryEntry,
  allMemories: MemoryEntry[],
  limit: number = 5
): MemoryEntry[] {
  const scores = new Map<string, number>();

  for (const memory of allMemories) {
    if (memory.id === targetMemory.id) continue;

    let score = 0;

    // 같은 카테고리 보너스
    if (memory.category === targetMemory.category) {
      score += 5;
    }

    // 같은 소유자 보너스
    if (memory.owner === targetMemory.owner) {
      score += 3;
    }

    // 태그 유사도
    const commonTags = memory.tags.filter((tag) =>
      targetMemory.tags.some((tt) => tt.toLowerCase() === tag.toLowerCase())
    );
    score += commonTags.length * 2;

    // 내용 키워드 매칭
    const targetWords = targetMemory.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const word of targetWords.slice(0, 10)) {
      if (memory.content.toLowerCase().includes(word)) {
        score += 1;
      }
    }

    scores.set(memory.id, score);
  }

  return allMemories
    .filter((m) => m.id !== targetMemory.id && (scores.get(m.id) || 0) > 0)
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
    .slice(0, limit);
}

/**
 * 카테고리별 메모리 그룹화
 */
export function groupByCategory(
  memories: MemoryEntry[]
): Map<MemoryCategory, MemoryEntry[]> {
  const groups = new Map<MemoryCategory, MemoryEntry[]>();

  for (const memory of memories) {
    const existing = groups.get(memory.category) || [];
    existing.push(memory);
    groups.set(memory.category, existing);
  }

  return groups;
}

/**
 * 태그 빈도 분석
 */
export function analyzeTagFrequency(
  memories: MemoryEntry[]
): Map<string, number> {
  const frequency = new Map<string, number>();

  for (const memory of memories) {
    for (const tag of memory.tags) {
      const lowerTag = tag.toLowerCase();
      frequency.set(lowerTag, (frequency.get(lowerTag) || 0) + 1);
    }
  }

  return new Map([...frequency.entries()].sort((a, b) => b[1] - a[1]));
}

/**
 * 검색 제안 생성
 */
export function generateSearchSuggestions(
  memories: MemoryEntry[],
  partialQuery: string,
  limit: number = 5
): string[] {
  const suggestions = new Set<string>();
  const lowerQuery = partialQuery.toLowerCase();

  // 제목에서 제안
  for (const memory of memories) {
    if (memory.title.toLowerCase().includes(lowerQuery)) {
      suggestions.add(memory.title);
    }
  }

  // 태그에서 제안
  for (const memory of memories) {
    for (const tag of memory.tags) {
      if (tag.toLowerCase().includes(lowerQuery)) {
        suggestions.add(tag);
      }
    }
  }

  return [...suggestions].slice(0, limit);
}
