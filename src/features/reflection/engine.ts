/**
 * Reflection Engine
 * 작업 완료 후 회고 실행
 */

import type {
  ReflectionResult,
  CreateMemoryInput,
  MemoryOwner,
} from '../memory/types';
import { extractLearnings, type TaskResult } from '../learning/extractor';
import { classifyBatch } from '../learning/categorizer';

/**
 * 회고 깊이 결정 요소
 */
interface ComplexityFactors {
  filesModified: number;
  linesChanged: number;
  errorCount: number;
  duration: number;
  hasUserFeedback: boolean;
  isNewFeature: boolean;
  involvedAgents: number;
}

/**
 * 회고 깊이 수준
 */
export type ReflectionDepth = 'simple' | 'standard' | 'deep';

/**
 * 복잡도 계산
 */
export function calculateComplexity(factors: ComplexityFactors): number {
  let score = 0;

  // 파일 수
  if (factors.filesModified > 5) score += 3;
  else if (factors.filesModified > 2) score += 2;
  else if (factors.filesModified > 0) score += 1;

  // 코드 변경량
  if (factors.linesChanged > 500) score += 3;
  else if (factors.linesChanged > 100) score += 2;
  else if (factors.linesChanged > 20) score += 1;

  // 에러 발생
  if (factors.errorCount > 3) score += 3;
  else if (factors.errorCount > 0) score += 2;

  // 작업 시간
  if (factors.duration > 30 * 60 * 1000) score += 2; // 30분 이상
  else if (factors.duration > 10 * 60 * 1000) score += 1; // 10분 이상

  // 사용자 피드백 존재
  if (factors.hasUserFeedback) score += 2;

  // 새 기능
  if (factors.isNewFeature) score += 2;

  // 관여 에이전트 수
  if (factors.involvedAgents > 2) score += 2;
  else if (factors.involvedAgents > 1) score += 1;

  return score;
}

/**
 * 적응형 깊이 결정
 */
export function determineDepth(factors: ComplexityFactors): ReflectionDepth {
  const complexity = calculateComplexity(factors);

  if (complexity >= 10) return 'deep';
  if (complexity >= 5) return 'standard';
  return 'simple';
}

/**
 * 간단한 회고 생성
 */
function generateSimpleReflection(result: TaskResult): ReflectionResult {
  const learnings: CreateMemoryInput[] = [];

  // 성공/실패 기록
  if (result.success) {
    learnings.push({
      title: `성공: ${result.description.slice(0, 50)}`,
      content: `${result.agent} 에이전트가 작업 완료.`,
      category: 'pattern',
      scope: 'project',
      owner: result.agent,
      confidence: 0.5,
      tags: ['success', 'quick'],
      sources: [result.taskId],
    });
  } else {
    learnings.push({
      title: `실패: ${result.description.slice(0, 50)}`,
      content: `작업 실패. 에러: ${result.errors.slice(0, 2).join(', ')}`,
      category: 'mistake',
      scope: 'project',
      owner: result.agent,
      confidence: 0.6,
      tags: ['failure', 'quick'],
      sources: [result.taskId],
    });
  }

  return {
    taskId: result.taskId,
    taskDescription: result.description,
    success: result.success,
    depth: 'simple',
    learnings,
    improvements: [],
    confirmedPatterns: [],
    reflectedAt: new Date(),
  };
}

/**
 * 표준 회고 생성
 */
function generateStandardReflection(result: TaskResult): ReflectionResult {
  // 기본 학습 추출
  const extraction = extractLearnings(result);
  const learnings = classifyBatch(extraction.learnings);

  // 개선점 도출
  const improvements: string[] = [];

  if (result.errors.length > 0) {
    improvements.push(`에러 방지: ${result.errors[0]}`);
  }

  if (result.duration > 10 * 60 * 1000) {
    improvements.push('작업 시간 단축 방법 모색');
  }

  // 확인된 패턴
  const confirmedPatterns: string[] = [];

  if (result.success && result.codeChanges.length > 0) {
    const languages = [...new Set(result.codeChanges.map((c) => c.language))];
    confirmedPatterns.push(`${languages.join(', ')} 작업 패턴`);
  }

  return {
    taskId: result.taskId,
    taskDescription: result.description,
    success: result.success,
    depth: 'standard',
    learnings,
    improvements,
    confirmedPatterns,
    reflectedAt: new Date(),
  };
}

/**
 * 심층 회고 생성
 */
function generateDeepReflection(result: TaskResult): ReflectionResult {
  // 기본 학습 추출
  const extraction = extractLearnings(result);
  const baseLearnings = classifyBatch(extraction.learnings);

  const learnings: CreateMemoryInput[] = [...baseLearnings];

  // 의사결정 분석
  if (result.codeChanges.length > 0) {
    learnings.push({
      title: '아키텍처 결정',
      content: `파일 구조 분석:\n${result.codeChanges
        .map((c) => `- ${c.filePath}: ${c.changeType} (${c.linesAdded}+ / ${c.linesRemoved}-)`)
        .join('\n')}`,
      category: 'decision',
      scope: 'project',
      confidence: 0.7,
      tags: ['architecture', 'decision'],
      sources: [result.taskId],
    });
  }

  // 에러 분석
  if (result.errors.length > 0) {
    learnings.push({
      title: '에러 패턴 분석',
      content: `발생한 에러 유형:\n${result.errors
        .map((e) => `- ${categorizeError(e)}`)
        .join('\n')}`,
      category: 'mistake',
      scope: 'project',
      confidence: 0.8,
      tags: ['error', 'analysis'],
      sources: [result.taskId],
    });
  }

  // 개선점 도출
  const improvements: string[] = [];

  if (result.errors.length > 0) {
    improvements.push(`에러 패턴 인식 및 사전 방지`);
    improvements.push(`테스트 케이스 추가: ${result.errors.length}개 에러 커버`);
  }

  if (result.duration > 20 * 60 * 1000) {
    improvements.push('작업 분할 고려: 더 작은 단위로 나누기');
  }

  if (result.codeChanges.filter((c) => c.changeType === 'modify').length > 3) {
    improvements.push('리팩토링 기회: 관련 코드 그룹화');
  }

  // 확인된 패턴
  const confirmedPatterns: string[] = [];

  if (result.success) {
    confirmedPatterns.push(`${result.agent} 에이전트 효과적인 작업 유형`);

    const changeTypes = [...new Set(result.codeChanges.map((c) => c.changeType))];
    if (changeTypes.length > 0) {
      confirmedPatterns.push(`작업 유형: ${changeTypes.join(', ')}`);
    }
  }

  // 컨텍스트 학습
  if (result.context && Object.keys(result.context).length > 0) {
    learnings.push({
      title: '작업 컨텍스트',
      content: `중요 컨텍스트: ${JSON.stringify(result.context, null, 2)}`,
      category: 'context',
      scope: 'project',
      confidence: 0.6,
      tags: ['context', 'deep-analysis'],
      sources: [result.taskId],
    });
  }

  return {
    taskId: result.taskId,
    taskDescription: result.description,
    success: result.success,
    depth: 'deep',
    learnings,
    improvements,
    confirmedPatterns,
    reflectedAt: new Date(),
  };
}

/**
 * 에러 분류
 */
function categorizeError(error: string): string {
  const lower = error.toLowerCase();

  if (lower.includes('type') || lower.includes('typescript')) {
    return `타입 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes('syntax') || lower.includes('parse')) {
    return `구문 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes('not found') || lower.includes('undefined') || lower.includes('null')) {
    return `참조 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes('permission') || lower.includes('access')) {
    return `권한 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('http')) {
    return `네트워크 에러: ${error.slice(0, 100)}`;
  }

  return `기타 에러: ${error.slice(0, 100)}`;
}

/**
 * 회고 실행 (메인 함수)
 */
export function reflect(
  result: TaskResult,
  options: {
    forceDepth?: ReflectionDepth;
    includeContext?: boolean;
  } = {}
): ReflectionResult {
  // 복잡도 요소 계산
  const factors: ComplexityFactors = {
    filesModified: result.filesModified.length,
    linesChanged: result.codeChanges.reduce((sum, c) => sum + c.linesAdded + c.linesRemoved, 0),
    errorCount: result.errors.length,
    duration: result.duration,
    hasUserFeedback: !!result.userFeedback,
    isNewFeature: result.codeChanges.some((c) => c.changeType === 'create'),
    involvedAgents: 1, // 단일 작업 기준
  };

  // 깊이 결정
  const depth = options.forceDepth || determineDepth(factors);

  // 깊이에 따른 회고 생성
  switch (depth) {
    case 'simple':
      return generateSimpleReflection(result);
    case 'standard':
      return generateStandardReflection(result);
    case 'deep':
      return generateDeepReflection(result);
    default:
      return generateStandardReflection(result);
  }
}

/**
 * 배치 회고
 */
export function reflectBatch(
  results: TaskResult[],
  options: {
    aggregateLearnings?: boolean;
  } = {}
): ReflectionResult[] {
  const reflections = results.map((r) => reflect(r));

  if (options.aggregateLearnings) {
    // 중복 학습 제거 및 강화
    const allLearnings = reflections.flatMap((r) => r.learnings);
    const uniqueLearnings = deduplicateLearnings(allLearnings);

    // 첫 번째 결과에 통합 학습 추가
    if (reflections.length > 0) {
      reflections[0].learnings = uniqueLearnings;
    }
  }

  return reflections;
}

/**
 * 학습 중복 제거
 */
function deduplicateLearnings(learnings: CreateMemoryInput[]): CreateMemoryInput[] {
  const seen = new Map<string, CreateMemoryInput>();

  for (const learning of learnings) {
    const key = `${learning.category}:${learning.title}`;

    if (seen.has(key)) {
      // 신뢰도가 더 높은 것 유지
      const existing = seen.get(key)!;
      if ((learning.confidence || 0) > (existing.confidence || 0)) {
        seen.set(key, learning);
      }
    } else {
      seen.set(key, learning);
    }
  }

  return Array.from(seen.values());
}

/**
 * 회고 요약 생성
 */
export function summarizeReflection(reflection: ReflectionResult): string {
  const lines: string[] = [];

  lines.push(`## 회고: ${reflection.taskDescription}`);
  lines.push(`- 결과: ${reflection.success ? '✅ 성공' : '❌ 실패'}`);
  lines.push(`- 깊이: ${reflection.depth}`);

  if (reflection.learnings.length > 0) {
    lines.push(`\n### 학습 (${reflection.learnings.length}개)`);
    for (const learning of reflection.learnings.slice(0, 5)) {
      lines.push(`- [${learning.category}] ${learning.title}`);
    }
  }

  if (reflection.improvements.length > 0) {
    lines.push(`\n### 개선점`);
    for (const improvement of reflection.improvements) {
      lines.push(`- ${improvement}`);
    }
  }

  if (reflection.confirmedPatterns.length > 0) {
    lines.push(`\n### 확인된 패턴`);
    for (const pattern of reflection.confirmedPatterns) {
      lines.push(`- ${pattern}`);
    }
  }

  return lines.join('\n');
}
