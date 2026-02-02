/**
 * Memory System
 * 에이전트 학습 및 메모리 시스템
 */

// Types
export * from './types';

// Storage
export {
  MemoryStorage,
  getDefaultStorage,
  setDefaultStorage,
  memoryToMarkdown,
  markdownToMemory,
  expandPath,
  getCategoryFileName,
} from './storage';

// Decay
export {
  calculateTimeDecay,
  calculateContradictionDecay,
  calculateReinforcementBoost,
  calculateAccessRecovery,
  calculateEffectiveConfidence,
  applyDecay,
  filterDecayedMemories,
  reinforceMemory,
  contradictMemory,
  recordAccess,
  processBatchDecay,
} from './decay';

// Conflict
export {
  detectConflict,
  resolveConflict,
  mergeMemories,
  detectBatchConflicts,
  autoResolveConflicts,
  calculateConflictSeverity,
} from './conflict';

// Search
export {
  filterMemories,
  calculateRelevanceScore,
  sortMemories,
  searchMemories,
  findSimilarMemories,
  groupByCategory,
  analyzeTagFrequency,
  generateSearchSuggestions,
} from './search';

// Manager
export { MemoryManager, getMemoryManager, setMemoryManager } from './manager';
