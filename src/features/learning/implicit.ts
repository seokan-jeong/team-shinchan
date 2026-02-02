/**
 * Implicit Feedback Detection
 * 사용자의 암묵적 피드백 감지 및 학습 변환
 */

import type {
  ImplicitFeedback,
  CreateMemoryInput,
  MemoryOwner,
  LearningExtraction,
} from '../memory/types';

/**
 * 사용자 행동 타입
 */
export interface UserAction {
  type: 'edit' | 'undo' | 'reject' | 'accept' | 'modify' | 'retry';
  timestamp: Date;
  context: {
    filePath?: string;
    originalContent?: string;
    modifiedContent?: string;
    agent?: MemoryOwner;
    taskDescription?: string;
    errorMessage?: string;
  };
}

/**
 * 변경 분석 결과
 */
interface ChangeAnalysis {
  hasSubstantialChange: boolean;
  changeType: 'style' | 'logic' | 'naming' | 'structure' | 'minor' | 'unknown';
  changedElements: string[];
  confidence: number;
}

/**
 * 변경 분석
 */
function analyzeChange(original: string, modified: string): ChangeAnalysis {
  if (!original || !modified) {
    return {
      hasSubstantialChange: false,
      changeType: 'unknown',
      changedElements: [],
      confidence: 0,
    };
  }

  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  const changedElements: string[] = [];
  let styleChanges = 0;
  let logicChanges = 0;
  let namingChanges = 0;
  let structureChanges = 0;

  // 줄 단위 비교
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  let changedLines = 0;

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] || '';
    const modLine = modifiedLines[i] || '';

    if (origLine !== modLine) {
      changedLines++;

      // 변경 유형 분석
      if (origLine.trim() === modLine.trim()) {
        // 공백만 변경
        styleChanges++;
        changedElements.push('whitespace');
      } else if (
        origLine.replace(/['"]/g, '') === modLine.replace(/['"]/g, '')
      ) {
        // 따옴표 스타일 변경
        styleChanges++;
        changedElements.push('quote-style');
      } else if (
        origLine.replace(/;/g, '') === modLine.replace(/;/g, '')
      ) {
        // 세미콜론 변경
        styleChanges++;
        changedElements.push('semicolon');
      } else if (hasNamingChange(origLine, modLine)) {
        namingChanges++;
        changedElements.push('naming');
      } else if (hasStructureChange(originalLines, modifiedLines, i)) {
        structureChanges++;
        changedElements.push('structure');
      } else {
        logicChanges++;
        changedElements.push('logic');
      }
    }
  }

  // 변경 비율 계산
  const changeRatio = changedLines / maxLines;
  const hasSubstantialChange = changeRatio > 0.05 || logicChanges > 0 || structureChanges > 0;

  // 주요 변경 유형 결정
  let changeType: ChangeAnalysis['changeType'] = 'unknown';
  const maxChanges = Math.max(styleChanges, logicChanges, namingChanges, structureChanges);

  if (maxChanges === 0) {
    changeType = 'minor';
  } else if (maxChanges === styleChanges) {
    changeType = 'style';
  } else if (maxChanges === logicChanges) {
    changeType = 'logic';
  } else if (maxChanges === namingChanges) {
    changeType = 'naming';
  } else if (maxChanges === structureChanges) {
    changeType = 'structure';
  }

  return {
    hasSubstantialChange,
    changeType,
    changedElements: [...new Set(changedElements)],
    confidence: Math.min(0.9, 0.5 + changeRatio),
  };
}

/**
 * 네이밍 변경 감지
 */
function hasNamingChange(original: string, modified: string): boolean {
  // 변수/함수명 패턴
  const namePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

  const origNames = new Set(original.match(namePattern) || []);
  const modNames = new Set(modified.match(namePattern) || []);

  // 새로운 이름이 추가되었거나 기존 이름이 변경됨
  const newNames = [...modNames].filter((n) => !origNames.has(n));
  const removedNames = [...origNames].filter((n) => !modNames.has(n));

  return newNames.length > 0 && removedNames.length > 0;
}

/**
 * 구조 변경 감지
 */
function hasStructureChange(
  originalLines: string[],
  modifiedLines: string[],
  lineIndex: number
): boolean {
  // 들여쓰기 수준 변경
  const getIndent = (line: string) => (line.match(/^\s*/) || [''])[0].length;

  if (lineIndex < originalLines.length && lineIndex < modifiedLines.length) {
    const origIndent = getIndent(originalLines[lineIndex]);
    const modIndent = getIndent(modifiedLines[lineIndex]);

    if (Math.abs(origIndent - modIndent) >= 2) {
      return true;
    }
  }

  // 줄 수 크게 변경
  if (Math.abs(originalLines.length - modifiedLines.length) > 5) {
    return true;
  }

  return false;
}

/**
 * 암묵적 피드백 감지
 */
export function detectImplicitFeedback(action: UserAction): ImplicitFeedback | null {
  switch (action.type) {
    case 'edit':
    case 'modify':
      if (action.context.originalContent && action.context.modifiedContent) {
        const analysis = analyzeChange(
          action.context.originalContent,
          action.context.modifiedContent
        );

        if (analysis.hasSubstantialChange) {
          return {
            type: 'modification',
            original: action.context.originalContent,
            modified: action.context.modifiedContent,
            agent: action.context.agent || 'shared',
            context: `${action.context.taskDescription || ''} - ${analysis.changeType} 변경`,
            timestamp: action.timestamp,
          };
        }
      }
      break;

    case 'undo':
    case 'reject':
      return {
        type: 'rejection',
        original: action.context.originalContent || '',
        agent: action.context.agent || 'shared',
        context: action.context.taskDescription || '사용자가 변경을 거부함',
        timestamp: action.timestamp,
      };

    case 'accept':
      return {
        type: 'acceptance',
        original: action.context.originalContent || '',
        agent: action.context.agent || 'shared',
        context: action.context.taskDescription || '사용자가 변경을 승인함',
        timestamp: action.timestamp,
      };

    case 'retry':
      return {
        type: 'correction',
        original: action.context.errorMessage || action.context.originalContent || '',
        agent: action.context.agent || 'shared',
        context: '사용자가 재시도를 요청함',
        timestamp: action.timestamp,
      };
  }

  return null;
}

/**
 * 피드백에서 학습 추출
 */
export function extractLearningFromFeedback(feedback: ImplicitFeedback): LearningExtraction {
  const learnings: CreateMemoryInput[] = [];
  const reinforceMemoryIds: string[] = [];
  const contradictMemoryIds: string[] = [];

  switch (feedback.type) {
    case 'modification': {
      if (feedback.original && feedback.modified) {
        const analysis = analyzeChange(feedback.original, feedback.modified);

        // 변경 유형에 따른 학습 생성
        if (analysis.changeType === 'style') {
          learnings.push({
            title: '코딩 스타일 선호',
            content: `사용자가 코드 스타일을 수정함. 변경된 요소: ${analysis.changedElements.join(', ')}`,
            category: 'preference',
            scope: 'global',
            owner: feedback.agent,
            confidence: analysis.confidence * 0.8,
            tags: ['style', 'preference', ...analysis.changedElements],
            sources: [feedback.timestamp.toISOString()],
          });
        } else if (analysis.changeType === 'naming') {
          learnings.push({
            title: '네이밍 선호',
            content: `사용자가 변수/함수명을 수정함.`,
            category: 'preference',
            scope: 'project',
            owner: feedback.agent,
            confidence: analysis.confidence * 0.9,
            tags: ['naming', 'convention'],
            sources: [feedback.timestamp.toISOString()],
          });
        } else if (analysis.changeType === 'logic') {
          learnings.push({
            title: '로직 수정',
            content: `사용자가 ${feedback.agent} 에이전트의 로직을 수정함. 컨텍스트: ${feedback.context}`,
            category: 'mistake',
            scope: 'project',
            owner: feedback.agent,
            confidence: analysis.confidence,
            tags: ['logic', 'correction'],
            sources: [feedback.timestamp.toISOString()],
          });
        }
      }
      break;
    }

    case 'rejection':
      learnings.push({
        title: '거부된 접근 방식',
        content: `사용자가 ${feedback.agent} 에이전트의 제안을 거부함. 컨텍스트: ${feedback.context}`,
        category: 'mistake',
        scope: 'global',
        owner: feedback.agent,
        confidence: 0.8,
        tags: ['rejection', 'avoid'],
        sources: [feedback.timestamp.toISOString()],
      });
      break;

    case 'acceptance':
      // 승인은 기존 메모리 강화로 처리
      learnings.push({
        title: '승인된 접근 방식',
        content: `사용자가 ${feedback.agent} 에이전트의 작업을 승인함. 컨텍스트: ${feedback.context}`,
        category: 'pattern',
        scope: 'global',
        owner: feedback.agent,
        confidence: 0.7,
        tags: ['approved', 'success'],
        sources: [feedback.timestamp.toISOString()],
      });
      break;

    case 'correction':
      learnings.push({
        title: '수정 필요했던 작업',
        content: `재시도가 요청됨. 원래 결과: ${feedback.original}`,
        category: 'mistake',
        scope: 'project',
        owner: feedback.agent,
        confidence: 0.7,
        tags: ['retry', 'correction'],
        sources: [feedback.timestamp.toISOString()],
      });
      break;
  }

  return {
    learnings,
    reinforceMemoryIds,
    contradictMemoryIds,
    extractionConfidence: 0.7,
  };
}

/**
 * 피드백 배치 처리
 */
export function processFeedbackBatch(
  actions: UserAction[]
): LearningExtraction {
  const allLearnings: CreateMemoryInput[] = [];
  const allReinforce: string[] = [];
  const allContradict: string[] = [];
  let totalConfidence = 0;

  for (const action of actions) {
    const feedback = detectImplicitFeedback(action);

    if (feedback) {
      const extraction = extractLearningFromFeedback(feedback);
      allLearnings.push(...extraction.learnings);
      allReinforce.push(...extraction.reinforceMemoryIds);
      allContradict.push(...extraction.contradictMemoryIds);
      totalConfidence += extraction.extractionConfidence;
    }
  }

  return {
    learnings: allLearnings,
    reinforceMemoryIds: [...new Set(allReinforce)],
    contradictMemoryIds: [...new Set(allContradict)],
    extractionConfidence: actions.length > 0 ? totalConfidence / actions.length : 0,
  };
}

/**
 * 수정 패턴 분석
 */
export function analyzeModificationPatterns(
  feedbacks: ImplicitFeedback[]
): Map<string, number> {
  const patterns = new Map<string, number>();

  for (const feedback of feedbacks) {
    if (feedback.type === 'modification' && feedback.original && feedback.modified) {
      const analysis = analyzeChange(feedback.original, feedback.modified);

      for (const element of analysis.changedElements) {
        patterns.set(element, (patterns.get(element) || 0) + 1);
      }
    }
  }

  return new Map([...patterns.entries()].sort((a, b) => b[1] - a[1]));
}
