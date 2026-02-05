/**
 * Learning System
 * Learning extraction and classification system
 */
export { extractLearnings, createSimpleLearning, extractFromCodeChanges, type TaskResult, type CodeChange, } from './extractor';
export { detectImplicitFeedback, extractLearningFromFeedback, processFeedbackBatch, analyzeModificationPatterns, type UserAction, } from './implicit';
export { determineCategory, calculateCategoryConfidence, classifyLearning, classifyBatch, suggestCategories, extractCategoryFromTags, classifyWithContext, analyzeCategoryDistribution, } from './categorizer';
//# sourceMappingURL=index.d.ts.map