/**
 * Debate Skill - Find optimal solutions through agent debates
 */

import type { SkillConfig, PluginContext, SkillResult, BuiltinAgentName } from '../../../types';

// Debate participants by topic
const DEBATE_PARTICIPANTS: Record<string, BuiltinAgentName[]> = {
  frontend: ['aichan', 'hiroshi'],
  backend: ['bunta', 'hiroshi'],
  devops: ['masao', 'hiroshi'],
  architecture: ['hiroshi', 'nene', 'misae'],
  fullstack: ['aichan', 'bunta', 'masao', 'hiroshi'],
  default: ['hiroshi', 'misae'],
};

// Analyze topic for participant selection
function analyzeTopicForParticipants(topic: string): BuiltinAgentName[] {
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
const AGENT_DISPLAY_NAMES: Record<BuiltinAgentName, string> = {
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
const AGENT_ROLES: Record<BuiltinAgentName, string> = {
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

export function createDebateSkill(context: PluginContext): SkillConfig {
  return {
    name: 'debate',
    displayName: 'Debate',
    description: 'Find optimal solutions through agent debates.',
    triggers: ['debate', '토론', '의견', '논의', '장단점', '비교'],
    autoActivate: true,

    handler: async ({ args, sessionState }): Promise<SkillResult> => {
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

**Delegating to Midori(Moderator) for facilitation...**`,

        inject: `<debate-mode>
Debate session is active.

## Debate Rules
- Max rounds: 3
- Each statement: Max 500 tokens
- No consensus: Vote to decide

## Debate Process

### Step 1: Collect Opinions (Parallel)
Request opinions from the following agents simultaneously:
${participants.map(p => `- Task(subagent_type="team-shinchan:${p}", prompt="Topic: ${topic}\n\nPlease provide your expert opinion on this topic. Include pros, cons, and recommendations.")`).join('\n')}

### Step 2: Feedback Rounds
Share collected opinions with each agent and request mutual feedback.

### Step 3: Consensus Building
Task(subagent_type="team-shinchan:hiroshi", prompt="Please synthesize the following opinions and propose the optimal solution: [opinions]")

### Step 4: Verification
Task(subagent_type="team-shinchan:actionkamen", prompt="Please review the following consensus: [consensus]")

## Debate Facilitation
Midori(Moderator) will facilitate the debate.
Task(subagent_type="team-shinchan:midori", prompt="Debate topic: ${topic}\nParticipants: ${participants.join(', ')}\n\nPlease facilitate the debate and reach consensus.")
</debate-mode>`,
      };
    },
  };
}
