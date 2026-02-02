/**
 * Help 스킬 - 도움말
 */

import type { SkillConfig, PluginContext, SkillResult } from '../../../types';

export function createHelpSkill(context: PluginContext): SkillConfig {
  return {
    name: 'help',
    displayName: 'Help',
    description: 'Team-Seokan 사용법을 안내합니다.',
    triggers: ['help', '도움말', '사용법'],
    autoActivate: false,

    handler: async (): Promise<SkillResult> => {
      return {
        success: true,
        output: `# 🎭 Team-Seokan 도움말

## 에이전트 팀 (14명)

### 오케스트레이션
- **짱구**: 메인 오케스트레이터
- **짱아**: 대규모 프로젝트 조율

### 실행
- **맹구**: 코드 작성/수정
- **철수**: 복잡한 장시간 작업

### 전문가
- **수지**: UI/UX 프론트엔드
- **흑곰**: API/DB 백엔드
- **훈이**: DevOps 인프라

### 조언 (읽기 전용)
- **신형만**: 전략 조언/디버깅
- **유리**: 계획 수립
- **봉미선**: 사전 분석
- **액션가면**: 검증/리뷰

### 탐색 (읽기 전용)
- **흰둥이**: 코드 탐색
- **채성아**: 문서 검색
- **나미리**: 이미지/PDF 분석

## 스킬

| 스킬 | 트리거 | 설명 |
|------|--------|------|
| ultrawork | ulw, 병렬 | 병렬 실행 모드 |
| ralph | 끝까지 | 완료까지 반복 |
| autopilot | 자동으로 | 자율 실행 |
| plan | 계획 | 계획 세션 |
| analyze | 분석 | 심층 분석 |
| deepsearch | 찾아줘 | 심층 검색 |

## 사용 예시

\`\`\`
# 에이전트 위임
delegate_task(agent="maenggu", task="버튼 컴포넌트 추가")

# 스킬 실행
/team-seokan:ultrawork 빠르게 처리해줘

# 배경 실행
background_task(agent="heendungi", task="API 엔드포인트 찾기")
\`\`\``,
      };
    },
  };
}
