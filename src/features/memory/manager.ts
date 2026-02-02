/**
 * Memory Manager
 * 메모리 시스템의 메인 인터페이스
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  MemoryEntry,
  CreateMemoryInput,
  UpdateMemoryInput,
  MemoryQuery,
  MemorySearchResult,
  MemorySummary,
  MemoryScope,
  MemoryOwner,
  MemoryStorageConfig,
} from './types';
import { DEFAULT_MEMORY_CONFIG, DECAY_CONFIG } from './types';
import { MemoryStorage, getDefaultStorage } from './storage';
import {
  applyDecay,
  reinforceMemory,
  contradictMemory,
  recordAccess,
  processBatchDecay,
  calculateEffectiveConfidence,
} from './decay';
import { detectBatchConflicts, autoResolveConflicts, mergeMemories } from './conflict';
import { searchMemories, findSimilarMemories, groupByCategory, analyzeTagFrequency } from './search';

/**
 * 메모리 매니저 클래스
 */
export class MemoryManager {
  private storage: MemoryStorage;
  private cache: {
    global: MemoryEntry[];
    project: MemoryEntry[];
    lastLoaded: Date | null;
  };
  private cacheExpiry: number = 5 * 60 * 1000; // 5분

  constructor(storage?: MemoryStorage) {
    this.storage = storage || getDefaultStorage();
    this.cache = {
      global: [],
      project: [],
      lastLoaded: null,
    };
  }

  /**
   * 초기화
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.loadMemories();
  }

  /**
   * 메모리 로드 (캐시 적용)
   */
  async loadMemories(force: boolean = false): Promise<void> {
    const now = new Date();

    // 캐시가 유효하면 로드 스킵
    if (
      !force &&
      this.cache.lastLoaded &&
      now.getTime() - this.cache.lastLoaded.getTime() < this.cacheExpiry
    ) {
      return;
    }

    const { global, project } = await this.storage.loadAllMemories();

    // 감쇠 적용
    this.cache.global = global.map((m) => applyDecay(m));
    this.cache.project = project.map((m) => applyDecay(m));
    this.cache.lastLoaded = now;
  }

  /**
   * 모든 메모리 가져오기 (글로벌 + 프로젝트 병합)
   */
  getAllMemories(): MemoryEntry[] {
    // 프로젝트 메모리가 우선 (같은 ID면 프로젝트 것 사용)
    const projectIds = new Set(this.cache.project.map((m) => m.id));
    const globalFiltered = this.cache.global.filter((m) => !projectIds.has(m.id));

    return [...this.cache.project, ...globalFiltered];
  }

  /**
   * 메모리 생성
   */
  async create(input: CreateMemoryInput): Promise<MemoryEntry> {
    await this.loadMemories();

    const now = new Date();
    const allMemories = this.getAllMemories();

    // 충돌 검사
    const conflicts = detectBatchConflicts(allMemories, input);

    if (conflicts.length > 0) {
      const resolutions = autoResolveConflicts(conflicts);
      const firstConflict = conflicts[0];
      const resolution = resolutions.get(firstConflict.existing.id);

      if (resolution) {
        switch (resolution.action) {
          case 'keep_existing':
            // 기존 메모리 강화
            const reinforced = reinforceMemory(firstConflict.existing);
            await this.storage.saveMemory(reinforced);
            this.invalidateCache();
            return reinforced;

          case 'replace':
            // 기존 메모리 반박 처리 후 새로 생성
            const contradicted = contradictMemory(firstConflict.existing);
            await this.storage.saveMemory(contradicted);
            break;

          case 'merge':
            // 병합
            if (resolution.mergedMemory) {
              await this.storage.saveMemory(resolution.mergedMemory);
              this.invalidateCache();
              return resolution.mergedMemory;
            }
            break;
        }
      }
    }

    // 새 메모리 생성
    const memory: MemoryEntry = {
      id: uuidv4(),
      title: input.title,
      content: input.content,
      category: input.category,
      scope: input.scope,
      owner: input.owner || 'shared',
      confidence: input.confidence ?? 0.5,
      tags: input.tags || [],
      sources: input.sources || [],
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      reinforcementCount: 0,
      decayFactor: 1.0,
      contradictionCount: 0,
      relatedMemories: input.relatedMemories || [],
      metadata: input.metadata || {},
    };

    await this.storage.saveMemory(memory);
    this.invalidateCache();

    return memory;
  }

  /**
   * 메모리 읽기
   */
  async read(id: string): Promise<MemoryEntry | null> {
    await this.loadMemories();

    const memory = this.getAllMemories().find((m) => m.id === id);

    if (memory) {
      // 접근 기록
      const updated = recordAccess(memory);
      await this.storage.saveMemory(updated);
      return updated;
    }

    return null;
  }

  /**
   * 메모리 업데이트
   */
  async update(id: string, input: UpdateMemoryInput): Promise<MemoryEntry | null> {
    await this.loadMemories();

    const memory = this.getAllMemories().find((m) => m.id === id);

    if (!memory) {
      return null;
    }

    const now = new Date();
    const updated: MemoryEntry = {
      ...memory,
      title: input.title ?? memory.title,
      content: input.content ?? memory.content,
      category: input.category ?? memory.category,
      confidence: input.confidence ?? memory.confidence,
      tags: input.tags ?? memory.tags,
      sources: input.sources ?? memory.sources,
      relatedMemories: input.relatedMemories ?? memory.relatedMemories,
      metadata: { ...memory.metadata, ...(input.metadata || {}) },
      updatedAt: now,
    };

    await this.storage.saveMemory(updated);
    this.invalidateCache();

    return updated;
  }

  /**
   * 메모리 삭제
   */
  async delete(id: string): Promise<boolean> {
    await this.loadMemories();

    const memory = this.getAllMemories().find((m) => m.id === id);

    if (!memory) {
      return false;
    }

    const result = await this.storage.deleteMemory(id, memory.scope);
    this.invalidateCache();

    return result;
  }

  /**
   * 메모리 검색
   */
  async search(
    query: MemoryQuery,
    context?: {
      keywords?: string[];
      currentTask?: string;
      currentAgent?: string;
      recentTags?: string[];
    }
  ): Promise<MemorySearchResult> {
    await this.loadMemories();
    return searchMemories(this.getAllMemories(), query, context);
  }

  /**
   * 메모리 강화
   */
  async reinforce(id: string): Promise<MemoryEntry | null> {
    await this.loadMemories();

    const memory = this.getAllMemories().find((m) => m.id === id);

    if (!memory) {
      return null;
    }

    const reinforced = reinforceMemory(memory);
    await this.storage.saveMemory(reinforced);
    this.invalidateCache();

    return reinforced;
  }

  /**
   * 메모리 반박
   */
  async contradict(id: string): Promise<MemoryEntry | null> {
    await this.loadMemories();

    const memory = this.getAllMemories().find((m) => m.id === id);

    if (!memory) {
      return null;
    }

    const contradicted = contradictMemory(memory);
    await this.storage.saveMemory(contradicted);
    this.invalidateCache();

    return contradicted;
  }

  /**
   * 유사 메모리 찾기
   */
  async findSimilar(id: string, limit: number = 5): Promise<MemoryEntry[]> {
    await this.loadMemories();

    const memory = this.getAllMemories().find((m) => m.id === id);

    if (!memory) {
      return [];
    }

    return findSimilarMemories(memory, this.getAllMemories(), limit);
  }

  /**
   * 메모리 요약 생성
   */
  async generateSummary(
    query?: MemoryQuery,
    maxTokens: number = 500
  ): Promise<MemorySummary> {
    await this.loadMemories();

    let memories = this.getAllMemories();

    if (query) {
      const result = await this.search(query);
      memories = result.memories;
    }

    // 신뢰도 높은 순으로 정렬
    const sorted = memories
      .map((m) => ({ memory: m, confidence: calculateEffectiveConfidence(m) }))
      .sort((a, b) => b.confidence - a.confidence);

    // 토큰 예산에 맞게 요약 생성
    const lines: string[] = [];
    const includedIds: string[] = [];
    let estimatedTokens = 0;
    const tokensPerChar = 0.25; // 대략적인 추정

    for (const { memory } of sorted) {
      const line = `- [${memory.category}] ${memory.title}: ${memory.content.slice(0, 100)}${memory.content.length > 100 ? '...' : ''}`;
      const lineTokens = Math.ceil(line.length * tokensPerChar);

      if (estimatedTokens + lineTokens > maxTokens) {
        break;
      }

      lines.push(line);
      includedIds.push(memory.id);
      estimatedTokens += lineTokens;
    }

    return {
      text: lines.join('\n'),
      includedMemoryIds: includedIds,
      generatedAt: new Date(),
      estimatedTokens,
    };
  }

  /**
   * 감쇠 처리 (배치)
   */
  async processDecay(): Promise<{
    removed: number;
    remaining: number;
  }> {
    await this.loadMemories(true);

    const globalResult = processBatchDecay(this.cache.global, {
      threshold: this.storage.getConfig().decayThreshold,
      applyChanges: true,
    });

    const projectResult = processBatchDecay(this.cache.project, {
      threshold: this.storage.getConfig().decayThreshold,
      applyChanges: true,
    });

    // 만료된 메모리 삭제
    for (const memory of [...globalResult.removed, ...projectResult.removed]) {
      await this.storage.deleteMemory(memory.id, memory.scope);
    }

    this.invalidateCache();

    return {
      removed: globalResult.removed.length + projectResult.removed.length,
      remaining: globalResult.processed.length + projectResult.processed.length,
    };
  }

  /**
   * 통계
   */
  async getStats(): Promise<{
    total: number;
    global: number;
    project: number;
    byCategory: Map<string, number>;
    byOwner: Map<string, number>;
    averageConfidence: number;
    topTags: [string, number][];
  }> {
    await this.loadMemories();

    const all = this.getAllMemories();
    const byCategory = groupByCategory(all);
    const tagFrequency = analyzeTagFrequency(all);

    const categoryCount = new Map<string, number>();
    for (const [cat, memories] of byCategory) {
      categoryCount.set(cat, memories.length);
    }

    const ownerCount = new Map<string, number>();
    for (const memory of all) {
      ownerCount.set(memory.owner, (ownerCount.get(memory.owner) || 0) + 1);
    }

    const avgConfidence =
      all.length > 0
        ? all.reduce((sum, m) => sum + calculateEffectiveConfidence(m), 0) / all.length
        : 0;

    return {
      total: all.length,
      global: this.cache.global.length,
      project: this.cache.project.length,
      byCategory: categoryCount,
      byOwner: ownerCount,
      averageConfidence: avgConfidence,
      topTags: [...tagFrequency.entries()].slice(0, 10),
    };
  }

  /**
   * 키워드로 잊기 (forget)
   */
  async forget(keyword: string): Promise<number> {
    await this.loadMemories();

    const result = await this.search({ keyword });
    let deletedCount = 0;

    for (const memory of result.memories) {
      const deleted = await this.delete(memory.id);
      if (deleted) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 캐시 무효화
   */
  private invalidateCache(): void {
    this.cache.lastLoaded = null;
  }

  /**
   * 백업
   */
  async backup(): Promise<string> {
    return this.storage.createBackup();
  }
}

/**
 * 기본 매니저 인스턴스
 */
let defaultManager: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!defaultManager) {
    defaultManager = new MemoryManager();
  }
  return defaultManager;
}

export function setMemoryManager(manager: MemoryManager): void {
  defaultManager = manager;
}
