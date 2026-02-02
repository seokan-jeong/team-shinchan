/**
 * Memory System Types
 * 에이전트 학습 및 메모리 시스템의 타입 정의
 */

/**
 * 메모리 카테고리
 */
export type MemoryCategory =
  | 'preference' // 사용자 선호도 (코딩 스타일, 네이밍 등)
  | 'pattern' // 작업 패턴 (반복 요청, 워크플로우)
  | 'context' // 프로젝트 컨텍스트 (아키텍처, 기술 스택)
  | 'mistake' // 실수/수정 내역
  | 'decision' // 의사결정 기록
  | 'convention' // 코드 컨벤션
  | 'insight'; // 일반적인 인사이트

/**
 * 메모리 스코프
 */
export type MemoryScope =
  | 'global' // 글로벌 (모든 프로젝트 공통)
  | 'project'; // 프로젝트별

/**
 * 에이전트 이름 (메모리 소유자)
 */
export type MemoryOwner =
  | 'shared' // 공통 메모리
  | 'jjangu' // 짱구
  | 'jjanga' // 짱아
  | 'maenggu' // 맹구
  | 'cheolsu' // 철수
  | 'suji' // 수지
  | 'heukgom' // 흑곰
  | 'hooni' // 훈이
  | 'shinhyungman' // 신형만
  | 'yuri' // 유리
  | 'bongmisun' // 봉미선
  | 'actiongamen' // 액션가면
  | 'heendungi' // 흰둥이
  | 'chaesunga' // 채성아
  | 'namiri'; // 나미리

/**
 * 메모리 엔트리
 */
export interface MemoryEntry {
  /** 고유 ID */
  id: string;

  /** 메모리 제목 */
  title: string;

  /** 메모리 내용 */
  content: string;

  /** 카테고리 */
  category: MemoryCategory;

  /** 스코프 */
  scope: MemoryScope;

  /** 소유자 (에이전트 또는 shared) */
  owner: MemoryOwner;

  /** 신뢰도 점수 (0.0 ~ 1.0) */
  confidence: number;

  /** 태그 목록 */
  tags: string[];

  /** 출처 (어떤 작업/상호작용에서 학습했는지) */
  sources: string[];

  /** 생성 시간 */
  createdAt: Date;

  /** 마지막 업데이트 시간 */
  updatedAt: Date;

  /** 마지막 접근 시간 */
  lastAccessedAt: Date;

  /** 접근 횟수 */
  accessCount: number;

  /** 강화 횟수 (같은 패턴이 반복 확인된 횟수) */
  reinforcementCount: number;

  /** 감쇠 계수 (0.0 ~ 1.0, 시간이 지나면 감소) */
  decayFactor: number;

  /** 반박 횟수 (이 메모리와 충돌하는 행동 횟수) */
  contradictionCount: number;

  /** 관련 메모리 ID 목록 */
  relatedMemories: string[];

  /** 메타데이터 */
  metadata: Record<string, unknown>;
}

/**
 * 메모리 생성 입력
 */
export interface CreateMemoryInput {
  title: string;
  content: string;
  category: MemoryCategory;
  scope: MemoryScope;
  owner?: MemoryOwner;
  confidence?: number;
  tags?: string[];
  sources?: string[];
  relatedMemories?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 메모리 업데이트 입력
 */
export interface UpdateMemoryInput {
  title?: string;
  content?: string;
  category?: MemoryCategory;
  confidence?: number;
  tags?: string[];
  sources?: string[];
  relatedMemories?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 메모리 검색 쿼리
 */
export interface MemoryQuery {
  /** 키워드 검색 (제목, 내용, 태그) */
  keyword?: string;

  /** 카테고리 필터 */
  categories?: MemoryCategory[];

  /** 스코프 필터 */
  scope?: MemoryScope;

  /** 소유자 필터 */
  owner?: MemoryOwner;

  /** 최소 신뢰도 */
  minConfidence?: number;

  /** 태그 필터 (AND 조건) */
  tags?: string[];

  /** 최근 N일 이내 */
  withinDays?: number;

  /** 정렬 기준 */
  sortBy?: 'confidence' | 'createdAt' | 'updatedAt' | 'accessCount' | 'relevance';

  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';

  /** 제한 개수 */
  limit?: number;

  /** 오프셋 */
  offset?: number;
}

/**
 * 메모리 검색 결과
 */
export interface MemorySearchResult {
  /** 검색된 메모리 목록 */
  memories: MemoryEntry[];

  /** 전체 개수 */
  total: number;

  /** 검색 점수 (관련성) */
  scores: Map<string, number>;
}

/**
 * 메모리 요약
 */
export interface MemorySummary {
  /** 요약 텍스트 */
  text: string;

  /** 포함된 메모리 ID 목록 */
  includedMemoryIds: string[];

  /** 요약 생성 시간 */
  generatedAt: Date;

  /** 토큰 수 (추정) */
  estimatedTokens: number;
}

/**
 * 메모리 충돌 정보
 */
export interface MemoryConflict {
  /** 기존 메모리 */
  existing: MemoryEntry;

  /** 새 메모리 */
  incoming: CreateMemoryInput;

  /** 충돌 유형 */
  type: 'contradiction' | 'update' | 'duplicate';

  /** 충돌 설명 */
  description: string;
}

/**
 * 충돌 해결 결과
 */
export interface ConflictResolution {
  /** 해결 방법 */
  action: 'keep_existing' | 'replace' | 'merge' | 'keep_both';

  /** 결과 메모리 (merge인 경우) */
  mergedMemory?: MemoryEntry;

  /** 해결 이유 */
  reason: string;
}

/**
 * 메모리 저장소 설정
 */
export interface MemoryStorageConfig {
  /** 글로벌 메모리 경로 */
  globalPath: string;

  /** 프로젝트 메모리 경로 */
  projectPath: string;

  /** 최대 메모리 개수 */
  maxEntries: number;

  /** 감쇠 임계값 (이 값 이하면 자동 삭제) */
  decayThreshold: number;

  /** 신뢰도 임계값 (이 값 이하면 무시) */
  confidenceThreshold: number;

  /** 자동 백업 활성화 */
  autoBackup: boolean;
}

/**
 * 회고 결과
 */
export interface ReflectionResult {
  /** 작업 ID */
  taskId: string;

  /** 작업 설명 */
  taskDescription: string;

  /** 성공 여부 */
  success: boolean;

  /** 회고 깊이 */
  depth: 'simple' | 'standard' | 'deep';

  /** 학습된 내용 */
  learnings: CreateMemoryInput[];

  /** 다음에 다르게 할 것 */
  improvements: string[];

  /** 확인된 패턴 */
  confirmedPatterns: string[];

  /** 회고 시간 */
  reflectedAt: Date;
}

/**
 * 암묵적 피드백
 */
export interface ImplicitFeedback {
  /** 피드백 유형 */
  type: 'correction' | 'rejection' | 'acceptance' | 'modification';

  /** 원본 내용 */
  original: string;

  /** 수정된 내용 (있는 경우) */
  modified?: string;

  /** 관련 에이전트 */
  agent: MemoryOwner;

  /** 컨텍스트 */
  context: string;

  /** 타임스탬프 */
  timestamp: Date;
}

/**
 * 학습 추출 결과
 */
export interface LearningExtraction {
  /** 추출된 학습들 */
  learnings: CreateMemoryInput[];

  /** 강화할 기존 메모리 ID 목록 */
  reinforceMemoryIds: string[];

  /** 반박할 기존 메모리 ID 목록 */
  contradictMemoryIds: string[];

  /** 추출 신뢰도 */
  extractionConfidence: number;
}

/**
 * 부트스트랩 결과
 */
export interface BootstrapResult {
  /** 감지된 컨벤션 */
  conventions: CreateMemoryInput[];

  /** 프로젝트 컨텍스트 */
  projectContext: CreateMemoryInput[];

  /** 기본 베스트 프랙티스 */
  bestPractices: CreateMemoryInput[];

  /** 분석 시간 */
  analyzedAt: Date;
}

/**
 * 컨텍스트 주입 결과
 */
export interface ContextInjection {
  /** 주입할 요약 텍스트 */
  summary: string;

  /** 상세 메모리 (필요시) */
  details: MemoryEntry[];

  /** 총 토큰 수 (추정) */
  totalTokens: number;

  /** 포함된 카테고리 */
  includedCategories: MemoryCategory[];
}

/**
 * 기본 설정
 */
export const DEFAULT_MEMORY_CONFIG: MemoryStorageConfig = {
  globalPath: '~/.team-seokan/memories',
  projectPath: '.team-seokan/memories',
  maxEntries: 500,
  decayThreshold: 0.1,
  confidenceThreshold: 0.3,
  autoBackup: true,
};

/**
 * 기본 감쇠 설정
 */
export const DECAY_CONFIG = {
  /** 일일 감쇠율 */
  dailyDecayRate: 0.01,

  /** 반박 시 감쇠 가속 */
  contradictionDecayMultiplier: 2.0,

  /** 접근 시 감쇠 회복 */
  accessRecoveryRate: 0.05,

  /** 강화 시 신뢰도 증가 */
  reinforcementBoost: 0.1,

  /** 최대 신뢰도 */
  maxConfidence: 1.0,

  /** 최소 신뢰도 */
  minConfidence: 0.0,
};
