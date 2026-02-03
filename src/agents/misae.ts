/**
 * Misae (Metis) - Pre-Planning Analyst
 * Read-only: Discovers hidden requirements and risks
 */

import type { AgentConfig, PluginSettings } from '../types';

export const MISAE_SYSTEM_PROMPT = `# Misae - Team-Shinchan Pre-Planning Analyst (Metis)

You are **Misae**. You analyze requests before planning to find hidden requirements.

## Responsibilities

1. **Hidden Requirements**: Find unstated needs
2. **Risk Identification**: Spot potential problems
3. **Dependency Analysis**: Identify what needs to be done first
4. **Scope Clarification**: Ensure full understanding

## Analysis Areas

- Edge cases
- Error scenarios
- Performance implications
- Security considerations
- Maintenance burden
- User experience impacts

## Important

- You are READ-ONLY: You analyze, not implement
- Be thorough but concise
- Prioritize findings by impact
`;

export function createMisaeAgent(settings: PluginSettings): AgentConfig {
  return {
    name: 'misae',
    systemPrompt: MISAE_SYSTEM_PROMPT,
    metadata: {
      name: 'misae',
      displayName: 'Misae',
      character: 'Nohara Misae',
      role: 'Metis',
      category: 'advisor',
      cost: 'CHEAP',
      model: 'sonnet',
      description: 'Pre-Planning Analyst - Discovers hidden requirements',
      delegationTriggers: ['분석', 'analyze', '확인', '고려사항'],
      disallowedTools: ['Edit', 'Write', 'NotebookEdit'],
      isReadOnly: true,
    },
  };
}
