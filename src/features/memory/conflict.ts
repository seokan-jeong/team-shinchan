/**
 * Memory Conflict Resolution
 * 메모리 충돌 해결
 */

import type {
  MemoryEntry,
  CreateMemoryInput,
  MemoryConflict,
  ConflictResolution,
} from './types';
import { calculateEffectiveConfidence } from './decay';

/**
 * 텍스트 유사도 계산 (Jaccard 유사도)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * 태그 유사도 계산
 */
function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 && tags2.length === 0) return 1;
  if (tags1.length === 0 || tags2.length === 0) return 0;

  const set1 = new Set(tags1.map((t) => t.toLowerCase()));
  const set2 = new Set(tags2.map((t) => t.toLowerCase()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * 충돌 감지
 */
export function detectConflict(
  existing: MemoryEntry,
  incoming: CreateMemoryInput
): MemoryConflict | null {
  // 같은 카테고리인지 확인
  if (existing.category !== incoming.category) {
    return null;
  }

  // 제목 유사도
  const titleSimilarity = calculateTextSimilarity(existing.title, incoming.title);

  // 내용 유사도
  const contentSimilarity = calculateTextSimilarity(existing.content, incoming.content);

  // 태그 유사도
  const tagSimilarity = calculateTagSimilarity(existing.tags, incoming.tags || []);

  // 전체 유사도 (가중 평균)
  const overallSimilarity = titleSimilarity * 0.4 + contentSimilarity * 0.4 + tagSimilarity * 0.2;

  // 높은 유사도 → 중복 또는 업데이트
  if (overallSimilarity > 0.8) {
    // 내용이 거의 같음 → 중복
    if (contentSimilarity > 0.9) {
      return {
        existing,
        incoming,
        type: 'duplicate',
        description: `기존 메모리와 거의 동일한 내용입니다. (유사도: ${(overallSimilarity * 100).toFixed(1)}%)`,
      };
    }

    // 제목은 같지만 내용이 다름 → 업데이트
    return {
      existing,
      incoming,
      type: 'update',
      description: `기존 메모리의 업데이트로 보입니다. (유사도: ${(overallSimilarity * 100).toFixed(1)}%)`,
    };
  }

  // 중간 유사도 + 같은 주제 → 잠재적 충돌
  if (overallSimilarity > 0.5 && titleSimilarity > 0.6) {
    // 내용이 상반되는지 확인 (간단한 휴리스틱)
    const contradictionIndicators = ['아니', '않', '반대', '대신', '말고', 'not', "don't", 'instead'];
    const hasContradiction = contradictionIndicators.some(
      (indicator) =>
        incoming.content.toLowerCase().includes(indicator) ||
        existing.content.toLowerCase().includes(indicator)
    );

    if (hasContradiction) {
      return {
        existing,
        incoming,
        type: 'contradiction',
        description: `기존 메모리와 상충되는 내용일 수 있습니다. (유사도: ${(overallSimilarity * 100).toFixed(1)}%)`,
      };
    }
  }

  return null;
}

/**
 * 충돌 해결
 * 기본 전략: 최신 우선 + 신뢰도 점수 기반
 */
export function resolveConflict(conflict: MemoryConflict): ConflictResolution {
  const { existing, incoming, type } = conflict;

  switch (type) {
    case 'duplicate':
      // 중복 → 기존 유지, 강화
      return {
        action: 'keep_existing',
        reason: '중복된 내용이므로 기존 메모리를 유지하고 강화합니다.',
      };

    case 'update':
      // 업데이트 → 최신 내용으로 교체 (신뢰도가 더 높으면)
      const existingEffectiveConfidence = calculateEffectiveConfidence(existing);
      const incomingConfidence = incoming.confidence ?? 0.5;

      if (incomingConfidence >= existingEffectiveConfidence) {
        return {
          action: 'replace',
          reason: `새 메모리의 신뢰도(${incomingConfidence.toFixed(2)})가 기존(${existingEffectiveConfidence.toFixed(2)})보다 높거나 같으므로 교체합니다.`,
        };
      } else {
        // 신뢰도가 낮으면 병합
        return {
          action: 'merge',
          mergedMemory: mergeMemories(existing, incoming),
          reason: `기존 메모리의 신뢰도가 더 높으므로 정보를 병합합니다.`,
        };
      }

    case 'contradiction':
      // 충돌 → 최신 우선 원칙 적용
      return {
        action: 'replace',
        reason: '최신 우선 원칙에 따라 새 메모리로 교체합니다. 기존 메모리는 반박으로 처리됩니다.',
      };

    default:
      return {
        action: 'keep_both',
        reason: '충돌 유형을 판단할 수 없어 둘 다 유지합니다.',
      };
  }
}

/**
 * 메모리 병합
 */
export function mergeMemories(existing: MemoryEntry, incoming: CreateMemoryInput): MemoryEntry {
  const now = new Date();

  // 태그 병합
  const mergedTags = [...new Set([...existing.tags, ...(incoming.tags || [])])];

  // 출처 병합
  const mergedSources = [...new Set([...existing.sources, ...(incoming.sources || [])])];

  // 관련 메모리 병합
  const mergedRelated = [
    ...new Set([...existing.relatedMemories, ...(incoming.relatedMemories || [])]),
  ];

  // 신뢰도 계산 (기존과 새 것의 가중 평균)
  const existingWeight = existing.reinforcementCount + 1;
  const incomingWeight = 1;
  const totalWeight = existingWeight + incomingWeight;
  const mergedConfidence =
    (existing.confidence * existingWeight + (incoming.confidence ?? 0.5) * incomingWeight) /
    totalWeight;

  return {
    ...existing,
    content: `${existing.content}\n\n[업데이트 ${now.toISOString().split('T')[0]}]\n${incoming.content}`,
    tags: mergedTags,
    sources: mergedSources,
    relatedMemories: mergedRelated,
    confidence: Math.min(1.0, mergedConfidence),
    updatedAt: now,
    reinforcementCount: existing.reinforcementCount + 1,
    metadata: {
      ...existing.metadata,
      ...(incoming.metadata || {}),
      mergedAt: now.toISOString(),
    },
  };
}

/**
 * 배치 충돌 검사
 */
export function detectBatchConflicts(
  existingMemories: MemoryEntry[],
  incoming: CreateMemoryInput
): MemoryConflict[] {
  const conflicts: MemoryConflict[] = [];

  for (const existing of existingMemories) {
    const conflict = detectConflict(existing, incoming);
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // 유사도가 높은 순으로 정렬
  return conflicts.sort((a, b) => {
    const simA = calculateTextSimilarity(a.existing.content, incoming.content);
    const simB = calculateTextSimilarity(b.existing.content, incoming.content);
    return simB - simA;
  });
}

/**
 * 자동 충돌 해결
 */
export function autoResolveConflicts(
  conflicts: MemoryConflict[]
): Map<string, ConflictResolution> {
  const resolutions = new Map<string, ConflictResolution>();

  for (const conflict of conflicts) {
    const resolution = resolveConflict(conflict);
    resolutions.set(conflict.existing.id, resolution);
  }

  return resolutions;
}

/**
 * 충돌 심각도 계산
 */
export function calculateConflictSeverity(conflict: MemoryConflict): 'low' | 'medium' | 'high' {
  switch (conflict.type) {
    case 'duplicate':
      return 'low';
    case 'update':
      return 'medium';
    case 'contradiction':
      return 'high';
    default:
      return 'medium';
  }
}
