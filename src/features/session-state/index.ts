/**
 * Team-Seokan 세션 상태 관리
 */

import type { SessionState, TodoItem, BackgroundTask, BuiltinAgentName } from '../../types';
import { randomUUID } from 'crypto';

// ============================================================
// 세션 상태 생성
// ============================================================

export function createSessionState(): SessionState {
  return {
    sessionId: randomUUID(),
    startTime: new Date(),
    messageCount: 0,
    contextUsage: 0,
    activeAgent: undefined,
    activeSkill: undefined,
    ralphLoopActive: false,
    ultraworkActive: false,
    autopilotActive: false,
    todos: [],
    backgroundTasks: [],
  };
}

// ============================================================
// TODO 관리
// ============================================================

export function addTodo(state: SessionState, content: string, activeForm: string): TodoItem {
  const todo: TodoItem = {
    id: randomUUID(),
    content,
    status: 'pending',
    activeForm,
    createdAt: new Date(),
  };
  state.todos.push(todo);
  return todo;
}

export function updateTodoStatus(
  state: SessionState,
  todoId: string,
  status: TodoItem['status']
): boolean {
  const todo = state.todos.find((t) => t.id === todoId);
  if (!todo) return false;

  todo.status = status;
  if (status === 'completed') {
    todo.completedAt = new Date();
  }
  return true;
}

export function getTodosByStatus(state: SessionState, status: TodoItem['status']): TodoItem[] {
  return state.todos.filter((t) => t.status === status);
}

export function hasPendingOrInProgressTodos(state: SessionState): boolean {
  return state.todos.some((t) => t.status === 'pending' || t.status === 'in_progress');
}

export function getInProgressTodo(state: SessionState): TodoItem | undefined {
  return state.todos.find((t) => t.status === 'in_progress');
}

// ============================================================
// 배경 작업 관리
// ============================================================

export function addBackgroundTask(
  state: SessionState,
  agentName: BuiltinAgentName,
  description: string
): BackgroundTask {
  const task: BackgroundTask = {
    id: randomUUID(),
    agentName,
    description,
    status: 'running',
    startTime: new Date(),
  };
  state.backgroundTasks.push(task);
  return task;
}

export function completeBackgroundTask(
  state: SessionState,
  taskId: string,
  result?: unknown,
  failed = false
): boolean {
  const task = state.backgroundTasks.find((t) => t.id === taskId);
  if (!task) return false;

  task.status = failed ? 'failed' : 'completed';
  task.endTime = new Date();
  task.result = result;
  return true;
}

export function getRunningBackgroundTasks(state: SessionState): BackgroundTask[] {
  return state.backgroundTasks.filter((t) => t.status === 'running');
}

export function canStartNewBackgroundTask(state: SessionState, maxConcurrent: number): boolean {
  return getRunningBackgroundTasks(state).length < maxConcurrent;
}

// ============================================================
// 스킬/에이전트 상태
// ============================================================

export function setActiveAgent(state: SessionState, agentName?: BuiltinAgentName): void {
  state.activeAgent = agentName;
}

export function setActiveSkill(state: SessionState, skillName?: string): void {
  state.activeSkill = skillName;
}

export function activateRalphLoop(state: SessionState): void {
  state.ralphLoopActive = true;
}

export function deactivateRalphLoop(state: SessionState): void {
  state.ralphLoopActive = false;
}

export function activateUltrawork(state: SessionState): void {
  state.ultraworkActive = true;
}

export function deactivateUltrawork(state: SessionState): void {
  state.ultraworkActive = false;
}

export function activateAutopilot(state: SessionState): void {
  state.autopilotActive = true;
}

export function deactivateAutopilot(state: SessionState): void {
  state.autopilotActive = false;
}

// ============================================================
// 컨텍스트 관리
// ============================================================

export function incrementMessageCount(state: SessionState): void {
  state.messageCount++;
}

export function updateContextUsage(state: SessionState, usage: number): void {
  state.contextUsage = usage;
}

export function isContextWarning(state: SessionState, threshold: number): boolean {
  return state.messageCount >= threshold;
}

// ============================================================
// 상태 직렬화
// ============================================================

export function serializeState(state: SessionState): string {
  return JSON.stringify(state, null, 2);
}

export function deserializeState(json: string): SessionState {
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    startTime: new Date(parsed.startTime),
    todos: parsed.todos.map((t: TodoItem) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
    })),
    backgroundTasks: parsed.backgroundTasks.map((t: BackgroundTask) => ({
      ...t,
      startTime: new Date(t.startTime),
      endTime: t.endTime ? new Date(t.endTime) : undefined,
    })),
  };
}
