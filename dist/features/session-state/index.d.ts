/**
 * Team-Shinchan Session State Management
 */
import type { SessionState, TodoItem, BackgroundTask, BuiltinAgentName } from '../../types';
export declare function createSessionState(): SessionState;
export declare function addTodo(state: SessionState, content: string, activeForm: string): TodoItem;
export declare function updateTodoStatus(state: SessionState, todoId: string, status: TodoItem['status']): boolean;
export declare function getTodosByStatus(state: SessionState, status: TodoItem['status']): TodoItem[];
export declare function hasPendingOrInProgressTodos(state: SessionState): boolean;
export declare function getInProgressTodo(state: SessionState): TodoItem | undefined;
export declare function addBackgroundTask(state: SessionState, agentName: BuiltinAgentName, description: string): BackgroundTask;
export declare function completeBackgroundTask(state: SessionState, taskId: string, result?: unknown, failed?: boolean): boolean;
export declare function getRunningBackgroundTasks(state: SessionState): BackgroundTask[];
export declare function canStartNewBackgroundTask(state: SessionState, maxConcurrent: number): boolean;
export declare function setActiveAgent(state: SessionState, agentName?: BuiltinAgentName): void;
export declare function setActiveSkill(state: SessionState, skillName?: string): void;
export declare function activateRalphLoop(state: SessionState): void;
export declare function deactivateRalphLoop(state: SessionState): void;
export declare function activateUltrawork(state: SessionState): void;
export declare function deactivateUltrawork(state: SessionState): void;
export declare function activateAutopilot(state: SessionState): void;
export declare function deactivateAutopilot(state: SessionState): void;
export declare function incrementMessageCount(state: SessionState): void;
export declare function updateContextUsage(state: SessionState, usage: number): void;
export declare function isContextWarning(state: SessionState, threshold: number): boolean;
export declare function serializeState(state: SessionState): string;
export declare function deserializeState(json: string): SessionState;
//# sourceMappingURL=index.d.ts.map