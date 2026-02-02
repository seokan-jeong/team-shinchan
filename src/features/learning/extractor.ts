/**
 * Learning Extractor
 * 상호작용에서 학습 포인트 추출
 */

import type {
  CreateMemoryInput,
  MemoryCategory,
  MemoryScope,
  MemoryOwner,
  LearningExtraction,
} from '../memory/types';

/**
 * 작업 결과 타입
 */
export interface TaskResult {
  taskId: string;
  description: string;
  success: boolean;
  agent: MemoryOwner;
  filesModified: string[];
  codeChanges: CodeChange[];
  userFeedback?: string;
  duration: number;
  errors: string[];
  context: Record<string, unknown>;
}

/**
 * 코드 변경 정보
 */
export interface CodeChange {
  filePath: string;
  changeType: 'create' | 'modify' | 'delete';
  language: string;
  linesAdded: number;
  linesRemoved: number;
  summary: string;
}

/**
 * 추출 패턴 정의
 */
interface ExtractionPattern {
  name: string;
  category: MemoryCategory;
  detect: (result: TaskResult) => boolean;
  extract: (result: TaskResult) => CreateMemoryInput | null;
}

/**
 * 코딩 스타일 패턴 감지
 */
const codingStylePatterns: ExtractionPattern[] = [
  {
    name: 'naming_convention',
    category: 'convention',
    detect: (result) => {
      return result.codeChanges.some(
        (c) => c.changeType === 'create' && (c.filePath.includes('component') || c.filePath.includes('service'))
      );
    },
    extract: (result) => {
      const patterns: string[] = [];

      for (const change of result.codeChanges) {
        // 파일명 패턴 분석
        const fileName = change.filePath.split('/').pop() || '';

        if (fileName.includes('.component.')) {
          patterns.push('컴포넌트 파일: *.component.{ext} 패턴');
        }
        if (fileName.includes('.service.')) {
          patterns.push('서비스 파일: *.service.{ext} 패턴');
        }
        if (fileName.includes('.test.') || fileName.includes('.spec.')) {
          patterns.push('테스트 파일: *.test.{ext} 또는 *.spec.{ext} 패턴');
        }
        if (fileName.match(/^[A-Z]/)) {
          patterns.push('PascalCase 파일명 사용');
        }
        if (fileName.match(/^[a-z]+(-[a-z]+)*\./)) {
          patterns.push('kebab-case 파일명 사용');
        }
      }

      if (patterns.length === 0) return null;

      return {
        title: '파일 네이밍 컨벤션',
        content: [...new Set(patterns)].join('\n'),
        category: 'convention',
        scope: 'project',
        confidence: 0.6,
        tags: ['naming', 'convention', 'file'],
        sources: [result.taskId],
      };
    },
  },

  {
    name: 'folder_structure',
    category: 'context',
    detect: (result) => {
      return result.codeChanges.filter((c) => c.changeType === 'create').length >= 2;
    },
    extract: (result) => {
      const folders = new Set<string>();

      for (const change of result.codeChanges) {
        const parts = change.filePath.split('/');
        if (parts.length > 1) {
          folders.add(parts.slice(0, -1).join('/'));
        }
      }

      if (folders.size === 0) return null;

      return {
        title: '프로젝트 폴더 구조',
        content: `사용된 폴더:\n${[...folders].map((f) => `- ${f}`).join('\n')}`,
        category: 'context',
        scope: 'project',
        confidence: 0.7,
        tags: ['structure', 'folder', 'project'],
        sources: [result.taskId],
      };
    },
  },
];

/**
 * 작업 패턴 감지
 */
const taskPatterns: ExtractionPattern[] = [
  {
    name: 'common_task_type',
    category: 'pattern',
    detect: (result) => result.success,
    extract: (result) => {
      const taskType = detectTaskType(result.description);

      if (!taskType) return null;

      return {
        title: `자주 하는 작업: ${taskType}`,
        content: `${taskType} 작업 완료. 설명: ${result.description}`,
        category: 'pattern',
        scope: 'global',
        confidence: 0.5,
        tags: ['task', taskType.toLowerCase()],
        sources: [result.taskId],
      };
    },
  },

  {
    name: 'agent_preference',
    category: 'preference',
    detect: (result) => result.success && result.agent !== 'shared',
    extract: (result) => {
      const taskType = detectTaskType(result.description);

      return {
        title: `${result.agent} 에이전트 작업 성공`,
        content: `${result.agent}가 "${result.description}" 작업을 성공적으로 완료함.${taskType ? ` 작업 유형: ${taskType}` : ''}`,
        category: 'pattern',
        scope: 'global',
        owner: result.agent,
        confidence: 0.5,
        tags: ['agent', result.agent, 'success'],
        sources: [result.taskId],
      };
    },
  },
];

/**
 * 실수/수정 패턴 감지
 */
const mistakePatterns: ExtractionPattern[] = [
  {
    name: 'error_recovery',
    category: 'mistake',
    detect: (result) => result.errors.length > 0 && result.success,
    extract: (result) => {
      return {
        title: '에러 복구 경험',
        content: `발생한 에러:\n${result.errors.map((e) => `- ${e}`).join('\n')}\n\n해결됨.`,
        category: 'mistake',
        scope: 'project',
        confidence: 0.7,
        tags: ['error', 'recovery', 'debug'],
        sources: [result.taskId],
      };
    },
  },

  {
    name: 'failed_approach',
    category: 'mistake',
    detect: (result) => !result.success,
    extract: (result) => {
      return {
        title: '실패한 접근 방식',
        content: `작업 "${result.description}"이 실패함.\n에러: ${result.errors.join(', ') || '알 수 없음'}`,
        category: 'mistake',
        scope: 'project',
        confidence: 0.6,
        tags: ['failure', 'avoid'],
        sources: [result.taskId],
      };
    },
  },
];

/**
 * 작업 유형 감지
 */
function detectTaskType(description: string): string | null {
  const lower = description.toLowerCase();

  const typePatterns: [RegExp, string][] = [
    [/컴포넌트|component|ui|버튼|button|모달|modal/i, 'UI 컴포넌트'],
    [/api|엔드포인트|endpoint|rest|graphql/i, 'API'],
    [/테스트|test|spec/i, '테스트'],
    [/리팩토|refactor/i, '리팩토링'],
    [/버그|bug|fix|수정/i, '버그 수정'],
    [/스타일|style|css|tailwind/i, '스타일링'],
    [/배포|deploy|ci|cd/i, '배포'],
    [/문서|doc|readme/i, '문서화'],
    [/설정|config|설치/i, '설정'],
  ];

  for (const [pattern, type] of typePatterns) {
    if (pattern.test(lower)) {
      return type;
    }
  }

  return null;
}

/**
 * 모든 패턴
 */
const allPatterns: ExtractionPattern[] = [
  ...codingStylePatterns,
  ...taskPatterns,
  ...mistakePatterns,
];

/**
 * 학습 추출 실행
 */
export function extractLearnings(result: TaskResult): LearningExtraction {
  const learnings: CreateMemoryInput[] = [];
  const reinforceMemoryIds: string[] = [];
  const contradictMemoryIds: string[] = [];

  for (const pattern of allPatterns) {
    if (pattern.detect(result)) {
      const learning = pattern.extract(result);
      if (learning) {
        learnings.push(learning);
      }
    }
  }

  // 추출 신뢰도 계산
  const extractionConfidence = result.success ? 0.8 : 0.5;

  return {
    learnings,
    reinforceMemoryIds,
    contradictMemoryIds,
    extractionConfidence,
  };
}

/**
 * 간단한 학습 생성 (명시적 학습용)
 */
export function createSimpleLearning(
  content: string,
  options: {
    category?: MemoryCategory;
    scope?: MemoryScope;
    owner?: MemoryOwner;
    tags?: string[];
    source?: string;
  } = {}
): CreateMemoryInput {
  // 제목 자동 생성 (첫 줄 또는 첫 50자)
  const firstLine = content.split('\n')[0];
  const title = firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;

  // 카테고리 자동 감지
  const category = options.category || detectCategory(content);

  return {
    title,
    content,
    category,
    scope: options.scope || 'global',
    owner: options.owner,
    confidence: 0.7,
    tags: options.tags || extractTags(content),
    sources: options.source ? [options.source] : [],
  };
}

/**
 * 카테고리 자동 감지
 */
function detectCategory(content: string): MemoryCategory {
  const lower = content.toLowerCase();

  if (/선호|prefer|좋아|싫어|always|never/i.test(lower)) {
    return 'preference';
  }
  if (/패턴|pattern|반복|workflow/i.test(lower)) {
    return 'pattern';
  }
  if (/아키텍처|구조|기술 스택|framework/i.test(lower)) {
    return 'context';
  }
  if (/실수|mistake|에러|error|주의/i.test(lower)) {
    return 'mistake';
  }
  if (/결정|decision|선택|chose/i.test(lower)) {
    return 'decision';
  }
  if (/컨벤션|convention|규칙|rule/i.test(lower)) {
    return 'convention';
  }

  return 'insight';
}

/**
 * 태그 자동 추출
 */
function extractTags(content: string): string[] {
  const tags: string[] = [];

  // 기술 키워드
  const techKeywords = [
    'react', 'vue', 'angular', 'typescript', 'javascript',
    'python', 'go', 'rust', 'java', 'node',
    'css', 'tailwind', 'sass', 'scss',
    'api', 'rest', 'graphql', 'database', 'sql',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure',
    'git', 'ci', 'cd', 'test', 'deploy',
  ];

  const lower = content.toLowerCase();

  for (const keyword of techKeywords) {
    if (lower.includes(keyword)) {
      tags.push(keyword);
    }
  }

  // 해시태그 추출
  const hashtagMatches = content.match(/#\w+/g);
  if (hashtagMatches) {
    tags.push(...hashtagMatches.map((t) => t.slice(1)));
  }

  return [...new Set(tags)].slice(0, 10);
}

/**
 * 코드 변경에서 학습 추출
 */
export function extractFromCodeChanges(changes: CodeChange[]): CreateMemoryInput[] {
  const learnings: CreateMemoryInput[] = [];

  // 언어별 그룹화
  const byLanguage = new Map<string, CodeChange[]>();
  for (const change of changes) {
    const lang = change.language || 'unknown';
    const existing = byLanguage.get(lang) || [];
    existing.push(change);
    byLanguage.set(lang, existing);
  }

  // 언어별 패턴 분석
  for (const [language, langChanges] of byLanguage) {
    if (langChanges.length >= 2) {
      learnings.push({
        title: `${language} 코드 작업 패턴`,
        content: `${language} 파일 ${langChanges.length}개 작업. 파일: ${langChanges.map((c) => c.filePath.split('/').pop()).join(', ')}`,
        category: 'pattern',
        scope: 'project',
        confidence: 0.5,
        tags: ['code', language.toLowerCase()],
        sources: [],
      });
    }
  }

  return learnings;
}
