/**
 * Memory Decay
 * 메모리 감쇠 관리
 */

import type { MemoryEntry } from './types';
import { DECAY_CONFIG } from './types';

/**
 * 시간 기반 감쇠 계산
 */
export function calculateTimeDecay(memory: MemoryEntry, now: Date = new Date()): number {
  const daysSinceUpdate = Math.floor(
    (now.getTime() - memory.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysSinceAccess = Math.floor(
    (now.getTime() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 더 오래된 날짜 기준으로 감쇠 계산
  const daysOld = Math.max(daysSinceUpdate, daysSinceAccess);

  // 지수 감쇠
  const decay = Math.pow(1 - DECAY_CONFIG.dailyDecayRate, daysOld);

  return Math.max(DECAY_CONFIG.minConfidence, decay);
}

/**
 * 반박에 의한 감쇠 계산
 */
export function calculateContradictionDecay(memory: MemoryEntry): number {
  if (memory.contradictionCount === 0) {
    return 1.0;
  }

  // 반박 횟수에 따른 감쇠
  const contradictionPenalty = Math.pow(
    1 - DECAY_CONFIG.dailyDecayRate * DECAY_CONFIG.contradictionDecayMultiplier,
    memory.contradictionCount
  );

  return Math.max(DECAY_CONFIG.minConfidence, contradictionPenalty);
}

/**
 * 강화에 의한 신뢰도 증가
 */
export function calculateReinforcementBoost(memory: MemoryEntry): number {
  if (memory.reinforcementCount === 0) {
    return 0;
  }

  // 강화 횟수에 따른 신뢰도 증가 (수확 체감)
  const boost = DECAY_CONFIG.reinforcementBoost * Math.log(memory.reinforcementCount + 1);

  return Math.min(boost, DECAY_CONFIG.maxConfidence - memory.confidence);
}

/**
 * 접근에 의한 감쇠 회복
 */
export function calculateAccessRecovery(accessCount: number): number {
  if (accessCount <= 1) {
    return 0;
  }

  // 접근 횟수에 따른 회복 (로그 스케일)
  return DECAY_CONFIG.accessRecoveryRate * Math.log(accessCount);
}

/**
 * 최종 유효 신뢰도 계산
 */
export function calculateEffectiveConfidence(memory: MemoryEntry, now: Date = new Date()): number {
  const baseConfidence = memory.confidence;

  // 시간 감쇠
  const timeDecay = calculateTimeDecay(memory, now);

  // 반박 감쇠
  const contradictionDecay = calculateContradictionDecay(memory);

  // 강화 보너스
  const reinforcementBoost = calculateReinforcementBoost(memory);

  // 접근 회복
  const accessRecovery = calculateAccessRecovery(memory.accessCount);

  // 최종 계산
  let effectiveConfidence = baseConfidence * timeDecay * contradictionDecay;
  effectiveConfidence += reinforcementBoost;
  effectiveConfidence += accessRecovery;

  // 범위 제한
  return Math.max(
    DECAY_CONFIG.minConfidence,
    Math.min(DECAY_CONFIG.maxConfidence, effectiveConfidence)
  );
}

/**
 * 메모리 감쇠 적용
 */
export function applyDecay(memory: MemoryEntry, now: Date = new Date()): MemoryEntry {
  const effectiveConfidence = calculateEffectiveConfidence(memory, now);
  const timeDecay = calculateTimeDecay(memory, now);

  return {
    ...memory,
    confidence: effectiveConfidence,
    decayFactor: timeDecay,
  };
}

/**
 * 감쇠된 메모리 필터링 (삭제 대상)
 */
export function filterDecayedMemories(
  memories: MemoryEntry[],
  threshold: number = DECAY_CONFIG.minConfidence
): {
  active: MemoryEntry[];
  expired: MemoryEntry[];
} {
  const now = new Date();
  const active: MemoryEntry[] = [];
  const expired: MemoryEntry[] = [];

  for (const memory of memories) {
    const effectiveConfidence = calculateEffectiveConfidence(memory, now);

    if (effectiveConfidence >= threshold) {
      active.push(applyDecay(memory, now));
    } else {
      expired.push(memory);
    }
  }

  return { active, expired };
}

/**
 * 메모리 강화
 */
export function reinforceMemory(memory: MemoryEntry): MemoryEntry {
  const now = new Date();

  return {
    ...memory,
    reinforcementCount: memory.reinforcementCount + 1,
    confidence: Math.min(
      DECAY_CONFIG.maxConfidence,
      memory.confidence + DECAY_CONFIG.reinforcementBoost
    ),
    updatedAt: now,
    lastAccessedAt: now,
  };
}

/**
 * 메모리 반박
 */
export function contradictMemory(memory: MemoryEntry): MemoryEntry {
  const now = new Date();
  const newContradictionCount = memory.contradictionCount + 1;

  // 반박에 의한 신뢰도 감소
  const penalty = DECAY_CONFIG.dailyDecayRate * DECAY_CONFIG.contradictionDecayMultiplier;
  const newConfidence = Math.max(DECAY_CONFIG.minConfidence, memory.confidence - penalty);

  return {
    ...memory,
    contradictionCount: newContradictionCount,
    confidence: newConfidence,
    updatedAt: now,
  };
}

/**
 * 메모리 접근 기록
 */
export function recordAccess(memory: MemoryEntry): MemoryEntry {
  const now = new Date();

  return {
    ...memory,
    accessCount: memory.accessCount + 1,
    lastAccessedAt: now,
  };
}

/**
 * 배치 감쇠 처리
 */
export function processBatchDecay(
  memories: MemoryEntry[],
  options: {
    threshold?: number;
    applyChanges?: boolean;
  } = {}
): {
  processed: MemoryEntry[];
  removed: MemoryEntry[];
  stats: {
    total: number;
    active: number;
    expired: number;
    averageConfidence: number;
  };
} {
  const threshold = options.threshold ?? DECAY_CONFIG.minConfidence;
  const applyChanges = options.applyChanges ?? true;

  const { active, expired } = filterDecayedMemories(memories, threshold);

  const processed = applyChanges ? active : memories.filter((m) => !expired.includes(m));

  const averageConfidence =
    processed.length > 0
      ? processed.reduce((sum, m) => sum + m.confidence, 0) / processed.length
      : 0;

  return {
    processed,
    removed: expired,
    stats: {
      total: memories.length,
      active: active.length,
      expired: expired.length,
      averageConfidence,
    },
  };
}
