/**
 * Bootstrap System
 * 프로젝트 초기 분석 및 베스트 프랙티스
 */

export {
  detectProjectType,
  analyzeStructure,
  detectConventions,
  runBootstrapAnalysis,
  type ProjectInfo,
  type StructureAnalysis,
} from './analyzer';

export {
  getBestPractices,
  getBestPracticesByCategory,
  summarizeBestPractices,
  getDefaultBestPractices,
} from './best-practices';
