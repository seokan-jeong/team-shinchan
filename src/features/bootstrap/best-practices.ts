/**
 * Best Practices
 * 언어/프레임워크별 기본 베스트 프랙티스
 */

import type { CreateMemoryInput, MemoryCategory } from '../memory/types';

/**
 * 베스트 프랙티스 정의
 */
interface BestPractice {
  title: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  applicableTo: string[]; // 적용 대상 (언어, 프레임워크)
}

/**
 * 공통 베스트 프랙티스
 */
const COMMON_PRACTICES: BestPractice[] = [
  {
    title: '명확한 네이밍',
    content:
      '변수, 함수, 클래스명은 그 목적을 명확히 나타내야 합니다. 축약어보다 명확한 이름을 선호합니다.',
    category: 'convention',
    tags: ['naming', 'readability'],
    applicableTo: ['*'],
  },
  {
    title: '단일 책임 원칙',
    content: '각 함수/클래스는 하나의 책임만 가져야 합니다. 너무 많은 일을 하는 코드는 분리합니다.',
    category: 'convention',
    tags: ['solid', 'architecture'],
    applicableTo: ['*'],
  },
  {
    title: 'DRY 원칙',
    content: "Don't Repeat Yourself. 중복 코드는 공통 함수/모듈로 추출합니다.",
    category: 'convention',
    tags: ['dry', 'refactoring'],
    applicableTo: ['*'],
  },
  {
    title: '에러 핸들링',
    content: '예외 상황을 적절히 처리합니다. 사용자에게 의미 있는 에러 메시지를 제공합니다.',
    category: 'convention',
    tags: ['error-handling', 'robustness'],
    applicableTo: ['*'],
  },
  {
    title: '테스트 작성',
    content: '핵심 로직에는 테스트를 작성합니다. 버그 수정 시 회귀 테스트를 추가합니다.',
    category: 'convention',
    tags: ['testing', 'quality'],
    applicableTo: ['*'],
  },
];

/**
 * TypeScript 베스트 프랙티스
 */
const TYPESCRIPT_PRACTICES: BestPractice[] = [
  {
    title: 'TypeScript 타입 명시',
    content:
      '함수 매개변수와 반환 타입을 명시합니다. any 사용을 최소화하고, unknown을 선호합니다.',
    category: 'convention',
    tags: ['typescript', 'type-safety'],
    applicableTo: ['TypeScript'],
  },
  {
    title: 'TypeScript 인터페이스 활용',
    content:
      '객체 타입은 interface로 정의합니다. 확장이 필요 없는 경우 type alias도 사용 가능합니다.',
    category: 'convention',
    tags: ['typescript', 'interface'],
    applicableTo: ['TypeScript'],
  },
  {
    title: 'TypeScript null 안전성',
    content:
      'strictNullChecks 활성화. optional chaining(?.)과 nullish coalescing(??)을 적절히 사용합니다.',
    category: 'convention',
    tags: ['typescript', 'null-safety'],
    applicableTo: ['TypeScript'],
  },
];

/**
 * React 베스트 프랙티스
 */
const REACT_PRACTICES: BestPractice[] = [
  {
    title: 'React 함수형 컴포넌트',
    content:
      '함수형 컴포넌트와 Hooks를 사용합니다. 클래스 컴포넌트보다 함수형을 선호합니다.',
    category: 'convention',
    tags: ['react', 'functional'],
    applicableTo: ['React'],
  },
  {
    title: 'React 상태 관리',
    content:
      '로컬 상태는 useState, 복잡한 상태는 useReducer를 사용합니다. 전역 상태는 Context 또는 외부 라이브러리를 고려합니다.',
    category: 'convention',
    tags: ['react', 'state'],
    applicableTo: ['React'],
  },
  {
    title: 'React 메모이제이션',
    content:
      '불필요한 리렌더링 방지를 위해 useMemo, useCallback, React.memo를 적절히 사용합니다.',
    category: 'convention',
    tags: ['react', 'performance'],
    applicableTo: ['React'],
  },
  {
    title: 'React 컴포넌트 분리',
    content:
      '컴포넌트가 너무 커지면 작은 단위로 분리합니다. 프레젠테이션과 컨테이너 컴포넌트를 구분합니다.',
    category: 'convention',
    tags: ['react', 'architecture'],
    applicableTo: ['React'],
  },
];

/**
 * Node.js 베스트 프랙티스
 */
const NODE_PRACTICES: BestPractice[] = [
  {
    title: 'Node.js 비동기 처리',
    content:
      'async/await을 사용합니다. 콜백 대신 Promise를 사용하고, 에러는 try-catch로 처리합니다.',
    category: 'convention',
    tags: ['nodejs', 'async'],
    applicableTo: ['node'],
  },
  {
    title: 'Node.js 환경 변수',
    content:
      '민감한 정보는 환경 변수로 관리합니다. dotenv 또는 비슷한 도구를 사용합니다.',
    category: 'convention',
    tags: ['nodejs', 'security', 'config'],
    applicableTo: ['node'],
  },
  {
    title: 'Node.js 모듈 구조',
    content:
      '기능별로 모듈을 분리합니다. index.ts로 public API를 노출하고 내부 구현은 숨깁니다.',
    category: 'convention',
    tags: ['nodejs', 'architecture'],
    applicableTo: ['node'],
  },
];

/**
 * 모든 베스트 프랙티스
 */
const ALL_PRACTICES: BestPractice[] = [
  ...COMMON_PRACTICES,
  ...TYPESCRIPT_PRACTICES,
  ...REACT_PRACTICES,
  ...NODE_PRACTICES,
];

/**
 * 해당하는 베스트 프랙티스 가져오기
 */
export function getBestPractices(
  languages: string[],
  frameworks: string[]
): CreateMemoryInput[] {
  const applicable = new Set<string>(['*', ...languages, ...frameworks]);

  return ALL_PRACTICES.filter((practice) =>
    practice.applicableTo.some((target) => applicable.has(target))
  ).map((practice) => ({
    title: practice.title,
    content: practice.content,
    category: practice.category,
    scope: 'global' as const,
    confidence: 0.8,
    tags: practice.tags,
    sources: ['best-practices'],
  }));
}

/**
 * 카테고리별 베스트 프랙티스
 */
export function getBestPracticesByCategory(
  category: MemoryCategory,
  languages: string[],
  frameworks: string[]
): CreateMemoryInput[] {
  return getBestPractices(languages, frameworks).filter(
    (p) => p.category === category
  );
}

/**
 * 베스트 프랙티스 요약
 */
export function summarizeBestPractices(practices: CreateMemoryInput[]): string {
  if (practices.length === 0) {
    return '적용 가능한 베스트 프랙티스가 없습니다.';
  }

  const lines = [
    '## 베스트 프랙티스',
    '',
    ...practices.map((p) => `- **${p.title}**: ${p.content.slice(0, 60)}...`),
  ];

  return lines.join('\n');
}

/**
 * 기본 베스트 프랙티스 (언어/프레임워크 무관)
 */
export function getDefaultBestPractices(): CreateMemoryInput[] {
  return COMMON_PRACTICES.map((practice) => ({
    title: practice.title,
    content: practice.content,
    category: practice.category,
    scope: 'global' as const,
    confidence: 0.75,
    tags: [...practice.tags, 'default'],
    sources: ['best-practices-default'],
  }));
}
