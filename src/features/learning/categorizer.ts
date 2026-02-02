/**
 * Learning Categorizer
 * 학습 내용 자동 분류
 */

import type { CreateMemoryInput, MemoryCategory } from '../memory/types';

/**
 * 카테고리 키워드 매핑
 */
const categoryKeywords: Record<MemoryCategory, string[]> = {
  preference: [
    '선호', 'prefer', '좋아', 'like', '싫어', 'dislike',
    '항상', 'always', '절대', 'never', '보통', 'usually',
    '스타일', 'style', '방식', 'way', '습관', 'habit',
  ],
  pattern: [
    '패턴', 'pattern', '반복', 'repeat', '워크플로우', 'workflow',
    '자주', 'often', '매번', 'every time', '일반적으로', 'typically',
    '프로세스', 'process', '순서', 'sequence', '단계', 'step',
  ],
  context: [
    '아키텍처', 'architecture', '구조', 'structure', '기술 스택', 'tech stack',
    '프레임워크', 'framework', '라이브러리', 'library', '의존성', 'dependency',
    '설정', 'config', '환경', 'environment', '인프라', 'infrastructure',
  ],
  mistake: [
    '실수', 'mistake', '에러', 'error', '버그', 'bug',
    '주의', 'caution', '조심', 'careful', '피해야', 'avoid',
    '문제', 'problem', '이슈', 'issue', '오류', 'fault',
  ],
  decision: [
    '결정', 'decision', '선택', 'choice', '채택', 'adopt',
    '이유', 'reason', '왜냐하면', 'because', '근거', 'rationale',
    '트레이드오프', 'tradeoff', '대안', 'alternative', '비교', 'compare',
  ],
  convention: [
    '컨벤션', 'convention', '규칙', 'rule', '가이드라인', 'guideline',
    '표준', 'standard', '형식', 'format', '명명', 'naming',
    '린트', 'lint', '포맷', 'format', '코드 스타일', 'code style',
  ],
  insight: [
    '발견', 'discover', '알게 됨', 'learned', '흥미로운', 'interesting',
    '참고', 'note', '팁', 'tip', '트릭', 'trick',
    '최적화', 'optimize', '개선', 'improve', '효율', 'efficient',
  ],
};

/**
 * 카테고리별 가중치
 */
const categoryWeights: Record<MemoryCategory, number> = {
  preference: 1.2,  // 개인화 우선
  pattern: 1.1,
  context: 1.0,
  mistake: 1.3,    // 실수 학습 중요
  decision: 1.0,
  convention: 1.1,
  insight: 0.9,
};

/**
 * 텍스트에서 카테고리 점수 계산
 */
function calculateCategoryScores(text: string): Map<MemoryCategory, number> {
  const scores = new Map<MemoryCategory, number>();
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = lowerText.match(regex);

      if (matches) {
        score += matches.length;
      }
    }

    // 가중치 적용
    const weight = categoryWeights[category as MemoryCategory];
    scores.set(category as MemoryCategory, score * weight);
  }

  return scores;
}

/**
 * 최적 카테고리 결정
 */
export function determineCategory(
  content: string,
  title?: string,
  tags?: string[]
): MemoryCategory {
  // 모든 텍스트 결합
  const fullText = [title || '', content, ...(tags || [])].join(' ');

  const scores = calculateCategoryScores(fullText);

  // 가장 높은 점수의 카테고리 반환
  let maxScore = 0;
  let bestCategory: MemoryCategory = 'insight';

  for (const [category, score] of scores) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * 카테고리 신뢰도 계산
 */
export function calculateCategoryConfidence(
  content: string,
  determinedCategory: MemoryCategory
): number {
  const scores = calculateCategoryScores(content);
  const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0);

  if (totalScore === 0) {
    return 0.3; // 기본 낮은 신뢰도
  }

  const categoryScore = scores.get(determinedCategory) || 0;
  return Math.min(0.95, 0.3 + (categoryScore / totalScore) * 0.7);
}

/**
 * 학습 분류 및 보강
 */
export function classifyLearning(input: CreateMemoryInput): CreateMemoryInput {
  // 카테고리가 이미 적절하게 설정된 경우 스킵
  const currentScores = calculateCategoryScores(input.content);
  const currentCategoryScore = currentScores.get(input.category) || 0;
  const maxScore = Math.max(...Array.from(currentScores.values()));

  // 현재 카테고리가 최적이 아닌 경우에만 재분류
  if (currentCategoryScore < maxScore * 0.8) {
    const betterCategory = determineCategory(input.content, input.title, input.tags);

    return {
      ...input,
      category: betterCategory,
      confidence: calculateCategoryConfidence(input.content, betterCategory),
    };
  }

  return input;
}

/**
 * 배치 분류
 */
export function classifyBatch(inputs: CreateMemoryInput[]): CreateMemoryInput[] {
  return inputs.map(classifyLearning);
}

/**
 * 카테고리 제안
 */
export function suggestCategories(content: string): {
  primary: MemoryCategory;
  alternatives: MemoryCategory[];
  scores: Map<MemoryCategory, number>;
} {
  const scores = calculateCategoryScores(content);

  // 점수 순 정렬
  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

  return {
    primary: sorted[0][0],
    alternatives: sorted.slice(1, 3).map(([cat]) => cat),
    scores,
  };
}

/**
 * 태그에서 카테고리 힌트 추출
 */
export function extractCategoryFromTags(tags: string[]): MemoryCategory | null {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  // 직접 카테고리 태그
  const directMappings: [string[], MemoryCategory][] = [
    [['pref', 'preference', 'like', 'style'], 'preference'],
    [['pattern', 'workflow', 'process'], 'pattern'],
    [['arch', 'architecture', 'context', 'infra'], 'context'],
    [['mistake', 'error', 'bug', 'avoid'], 'mistake'],
    [['decision', 'choice', 'rationale'], 'decision'],
    [['convention', 'rule', 'standard'], 'convention'],
    [['tip', 'insight', 'note'], 'insight'],
  ];

  for (const [keywords, category] of directMappings) {
    if (keywords.some((k) => tagSet.has(k))) {
      return category;
    }
  }

  return null;
}

/**
 * 컨텍스트 기반 분류
 */
export function classifyWithContext(
  input: CreateMemoryInput,
  context: {
    recentCategories?: MemoryCategory[];
    agentType?: string;
    taskType?: string;
  }
): CreateMemoryInput {
  let classified = classifyLearning(input);

  // 에이전트 유형에 따른 조정
  if (context.agentType) {
    const agentCategoryBias: Record<string, MemoryCategory> = {
      maenggu: 'pattern',     // 실행자 → 패턴
      suji: 'convention',     // 프론트엔드 → 컨벤션
      heukgom: 'context',     // 백엔드 → 컨텍스트
      shinhyungman: 'insight', // 조언자 → 인사이트
      yuri: 'decision',       // 플래너 → 결정
    };

    const biasCategory = agentCategoryBias[context.agentType];
    if (biasCategory) {
      const scores = calculateCategoryScores(classified.content);
      const biasScore = scores.get(biasCategory) || 0;
      const currentScore = scores.get(classified.category) || 0;

      // 바이어스 카테고리가 비슷하게 높으면 우선
      if (biasScore >= currentScore * 0.7) {
        classified = {
          ...classified,
          category: biasCategory,
        };
      }
    }
  }

  // 작업 유형에 따른 조정
  if (context.taskType) {
    const taskCategoryBias: Record<string, MemoryCategory> = {
      'bug fix': 'mistake',
      'refactor': 'decision',
      'new feature': 'pattern',
      'style': 'convention',
      'config': 'context',
    };

    const biasCategory = Object.entries(taskCategoryBias).find(([task]) =>
      context.taskType!.toLowerCase().includes(task)
    )?.[1];

    if (biasCategory && classified.category === 'insight') {
      classified = {
        ...classified,
        category: biasCategory,
      };
    }
  }

  return classified;
}

/**
 * 카테고리 통계 분석
 */
export function analyzeCategoryDistribution(
  learnings: CreateMemoryInput[]
): Map<MemoryCategory, { count: number; avgConfidence: number }> {
  const stats = new Map<MemoryCategory, { count: number; totalConfidence: number }>();

  for (const learning of learnings) {
    const existing = stats.get(learning.category) || { count: 0, totalConfidence: 0 };
    stats.set(learning.category, {
      count: existing.count + 1,
      totalConfidence: existing.totalConfidence + (learning.confidence || 0.5),
    });
  }

  const result = new Map<MemoryCategory, { count: number; avgConfidence: number }>();

  for (const [category, { count, totalConfidence }] of stats) {
    result.set(category, {
      count,
      avgConfidence: totalConfidence / count,
    });
  }

  return result;
}
