/**
 * Team-Seokan 에이전트 시스템
 */

import type { AgentConfig, PluginSettings, BuiltinAgentName } from '../types';
import { AGENT_MODEL_MAP, READ_ONLY_AGENTS } from '../config';

// 에이전트 생성 함수들
import { createJjanguAgent } from './jjangu';
import { createJjangaAgent } from './jjanga';
import { createMaengguAgent } from './maenggu';
import { createCheolsuAgent } from './cheolsu';
import { createSujiAgent } from './suji';
import { createHeukgomAgent } from './heukgom';
import { createHooniAgent } from './hooni';
import { createShinhyungmanAgent } from './shinhyungman';
import { createYuriAgent } from './yuri';
import { createBongmisunAgent } from './bongmisun';
import { createActiongamenAgent } from './actiongamen';
import { createHeendungiAgent } from './heendungi';
import { createChaesungaAgent } from './chaesunga';
import { createNamiriAgent } from './namiri';

// ============================================================
// 에이전트 팩토리 맵
// ============================================================

const AGENT_FACTORIES: Record<BuiltinAgentName, (settings: PluginSettings) => AgentConfig> = {
  jjangu: createJjanguAgent,
  jjanga: createJjangaAgent,
  maenggu: createMaengguAgent,
  cheolsu: createCheolsuAgent,
  suji: createSujiAgent,
  heukgom: createHeukgomAgent,
  hooni: createHooniAgent,
  shinhyungman: createShinhyungmanAgent,
  yuri: createYuriAgent,
  bongmisun: createBongmisunAgent,
  actiongamen: createActiongamenAgent,
  heendungi: createHeendungiAgent,
  chaesunga: createChaesungaAgent,
  namiri: createNamiriAgent,
};

// ============================================================
// 모든 내장 에이전트 생성
// ============================================================

export async function createBuiltinAgents(settings: PluginSettings): Promise<AgentConfig[]> {
  const agents: AgentConfig[] = [];

  for (const [name, factory] of Object.entries(AGENT_FACTORIES)) {
    const agentName = name as BuiltinAgentName;

    // 비활성화된 에이전트 건너뛰기
    if (settings.agentOverrides?.[agentName]?.disabled) {
      continue;
    }

    const agent = factory(settings);

    // 오버라이드 적용
    if (settings.agentOverrides?.[agentName]) {
      const override = settings.agentOverrides[agentName];
      if (override.model) {
        agent.metadata.model = override.model;
      }
      if (override.promptAppend) {
        agent.systemPrompt += '\n\n' + override.promptAppend;
      }
      if (override.allowedTools) {
        agent.metadata.allowedTools = override.allowedTools;
      }
      if (override.disallowedTools) {
        agent.metadata.disallowedTools = override.disallowedTools;
      }
    }

    agents.push(agent);
  }

  return agents;
}

// ============================================================
// 에이전트 조회
// ============================================================

export function getAgentByName(
  agents: AgentConfig[],
  name: BuiltinAgentName
): AgentConfig | undefined {
  return agents.find((a) => a.name === name);
}

export function isReadOnlyAgent(name: BuiltinAgentName): boolean {
  return READ_ONLY_AGENTS.includes(name);
}

export function getAgentModel(name: BuiltinAgentName, settings: PluginSettings): string {
  return settings.agentOverrides?.[name]?.model || AGENT_MODEL_MAP[name];
}

// ============================================================
// 내보내기
// ============================================================

export {
  createJjanguAgent,
  createJjangaAgent,
  createMaengguAgent,
  createCheolsuAgent,
  createSujiAgent,
  createHeukgomAgent,
  createHooniAgent,
  createShinhyungmanAgent,
  createYuriAgent,
  createBongmisunAgent,
  createActiongamenAgent,
  createHeendungiAgent,
  createChaesungaAgent,
  createNamiriAgent,
};
