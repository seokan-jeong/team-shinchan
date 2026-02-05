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
    if (/ui|ux|frontend|component|react|css|style/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.frontend;
    }
    if (/api|backend|db|database|server|graphql|rest/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.backend;
    }
    if (/deploy|infra|devops|ci|cd|docker|k8s/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.devops;
    }
    if (/architecture|design|system/.test(lowerTopic)) {
        return DEBATE_PARTICIPANTS.architecture;
    }
    if (/fullstack|full-stack|integrated/.test(lowerTopic)) {
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
        triggers: ['debate', 'discuss', 'opinions', 'pros and cons', 'compare'],
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

**Midori will conduct the Debate.**`,
                inject: `<debate-mode>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 EXECUTE IMMEDIATELY: Debate Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 1: Call Midori to Conduct Debate

You MUST immediately delegate this debate to Midori using the Task tool.

Task(
  subagent_type="team-shinchan:midori",
  model="opus",
  prompt="Please conduct a Debate.

## Topic
${topic}

## Panel
${participants.map(p => `- ${AGENT_DISPLAY_NAMES[p]} (${AGENT_ROLES[p]})`).join('\n')}

## Process
1. Output debate start announcement
2. Collect opinions from each panel member (parallel Task calls)
3. Output each opinion in real-time
4. Request consensus from Hiroshi
5. Output final decision

## Output Format
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate in Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Topic: {topic}
👥 Panel: {panel list}

🎤 Round 1: Opinion Collection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Each agent's opinion]

✅ Recommended Decision
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Decision: {decision}
📝 Rationale: {rationale}

IMPORTANT: Execute the Debate immediately and return the result to Shinnosuke."
)

## Step 2: Relay Results to User

After receiving Midori's result, you MUST present it to the user in this format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Topic: ${topic}

🎤 Expert Opinions:
[Summarize each panelist's opinion concisely]
- [${participants[0] ? AGENT_DISPLAY_NAMES[participants[0]] : 'Agent'}]: {opinion summary}
- [${participants[1] ? AGENT_DISPLAY_NAMES[participants[1]] : 'Agent'}]: {opinion summary}

✅ Recommended Decision: {conclusion from Midori}
📝 Rationale: {decision rationale}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 3: Ask for User's Decision

After presenting the results, ask the user:

"Do you agree with the above recommended decision? If you have different opinions or additional considerations, please let me know."

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
