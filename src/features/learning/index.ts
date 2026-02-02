/**
 * Learning System
 * 학습 추출 및 분류 시스템
 */

// Extractor
export {
  extractLearnings,
  createSimpleLearning,
  extractFromCodeChanges,
  type TaskResult,
  type CodeChange,
} from './extractor';

// Implicit Feedback
export {
  detectImplicitFeedback,
  extractLearningFromFeedback,
  processFeedbackBatch,
  analyzeModificationPatterns,
  type UserAction,
} from './implicit';

// Categorizer
export {
  determineCategory,
  calculateCategoryConfidence,
  classifyLearning,
  classifyBatch,
  suggestCategories,
  extractCategoryFromTags,
  classifyWithContext,
  analyzeCategoryDistribution,
} from './categorizer';
