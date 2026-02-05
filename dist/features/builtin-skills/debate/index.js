/**
 * Debate Skill - Find optimal solutions through agent debates
 */
// Debate participants by topic
const DEBATE_PARTICIPANTS = {
    frontend: ['aichan', 'hiroshi'],
    backend: ['bunta', 'hiroshi'],
    devops: ['masao', 'hiroshi'],
    architecture: ['hiroshi', 'nene', 'misae'],
    fullstack: ['aichan', 'bunta', 'masao', 'hiroshi'],
    default: ['hiroshi', 'misae'],
};
// Analyze topic for participant selection
function analyzeTopicForParticipants(topic) {
    const lowerTopic = topic.toLowerCase();
    if (/ui|ux|프론트|frontend|컴포넌트|component|react|css|스타일/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.frontend;
    }
    if (/api|백엔드|backend|db|database|서버|server|graphql|rest/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.backend;
    }
    if (/배포|deploy|인프라|infra|devops|ci|cd|docker|k8s/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.devops;
    }
    if (/아키텍처|architecture|설계|design|구조|시스템/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.architecture;
    }
    if (/전체|풀스택|fullstack|통합/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.fullstack;
    }
    return DEBATE_PARTICIPANTS.default;
}
// Agent display names
const AGENT_DISPLAY_NAMES = {
    shinnosuke: 'Shinnosuke',
    himawari: 'Himawari',
    bo: 'Bo',
    kazama: 'Kazama',
    aichan: 'Aichan',
    bunta: 'Bunta',
    masao: 'Masao',
    hiroshi: 'Hiroshi',
    nene: 'Nene',
    misae: 'Misae',
    actionkamen: 'Action Kamen',
    shiro: 'Shiro',
    masumi: 'Masumi',
    ume: 'Ume',
    midori: 'Midori',
};
// Agent roles
const AGENT_ROLES = {
    shinnosuke: 'Orchestrator',
    himawari: 'Atlas',
    bo: 'Executor',
    kazama: 'Hephaestus',
    aichan: 'Frontend',
    bunta: 'Backend',
    masao: 'DevOps',
    hiroshi: 'Oracle',
    nene: 'Planner',
    misae: 'Metis',
    actionkamen: 'Reviewer',
    shiro: 'Explorer',
    masumi: 'Librarian',
    ume: 'Multimodal',
    midori: 'Moderator',
};
export function createDebateSkill(context) {
    return {
        name: 'debate',
        displayName: 'Debate',
        description: 'Find optimal solutions through agent debates.',
        triggers: ['debate', '토론', '의견', '논의', '장단점', '비교'],
        autoActivate: true,
        handler: async ({ args, sessionState }) => {
            const topic = args || 'Please enter a debate topic';
            const participants = analyzeTopicForParticipants(topic);
            // Update session state
            sessionState.activeSkill = 'debate';
            sessionState.debateActive = true;
            sessionState.debateRound = 0;
            sessionState.debateMaxRounds = 3;
            sessionState.debateParticipants = participants;
            sessionState.debateTopic = topic;
            const participantList = participants
                .map(p => `- **${AGENT_DISPLAY_NAMES[p]}** (${AGENT_ROLES[p]})`)
                .join('\n');
            return {
                success: true,
                output: `🗣️ **Debate Session Started**

## Topic
${topic}

## Participating Agents
${participantList}

## Debate Process

### Phase 1: Opinion Collection
Each expert presents their perspective.

### Phase 2: Mutual Feedback (Max 3 rounds)
Exchange feedback and rebuttals on opinions.

### Phase 3: Consensus Building
Hiroshi(Oracle) synthesizes all opinions for final recommendation.

### Phase 4: Verification
Action Kamen(Reviewer) reviews the consensus.

---

**Midori가 Debate를 진행합니다.**`,
                inject: `<debate-mode>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 EXECUTE IMMEDIATELY: Debate Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 1: Call Midori to Conduct Debate

You MUST immediately delegate this debate to Midori using the Task tool.

Task(
  subagent_type="team-shinchan:midori",
  model="opus",
  prompt="Debate를 진행해주세요.

## 주제
${topic}

## 패널
${participants.map(p => `- ${AGENT_DISPLAY_NAMES[p]} (${AGENT_ROLES[p]})`).join('\n')}

## 진행 방식
1. Debate 시작 공지 출력
2. 각 패널로부터 의견 수집 (병렬 Task 호출)
3. 각 의견 실시간 출력
4. Hiroshi에게 합의 도출 요청
5. 최종 결정 사항 출력

## 출력 형식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate 진행 중
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주제: {주제}
👥 패널: {패널 목록}

🎤 Round 1: 의견 수집
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[각 에이전트 의견]

✅ 권장 결정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 결정: {결정}
📝 근거: {근거}

IMPORTANT: 즉시 Debate를 실행하고 결과를 Shinnosuke에게 반환하세요."
)

## Step 2: Relay Results to User

After receiving Midori's result, you MUST present it to the user in this format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주제: ${topic}

🎤 전문가 의견:
[Summarize each panelist's opinion concisely]
- [${participants[0] ? AGENT_DISPLAY_NAMES[participants[0]] : 'Agent'}]: {의견 요약}
- [${participants[1] ? AGENT_DISPLAY_NAMES[participants[1]] : 'Agent'}]: {의견 요약}

✅ 권장 결정: {Midori가 제시한 결론}
📝 근거: {결정 근거}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 3: Ask for User's Decision

After presenting the results, ask the user:

"위 권장 결정에 동의하시나요? 다른 의견이나 추가로 고려할 사항이 있으시면 말씀해주세요."

## Step 4: Finalize Decision

- If user agrees: Document the decision and proceed
- If user has concerns: Address them and refine the decision
- Never proceed without user confirmation

CRITICAL:
- Use the Task tool to call team-shinchan:midori
- Wait for Midori's complete response
- Present results clearly to user
- Get user confirmation before proceeding
- DO NOT make final decisions without user input
</debate-mode>`,
            };
        },
    };
}
