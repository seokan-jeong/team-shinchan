/**
 * Team-Seokan Session State Management
 */
import { randomUUID } from 'crypto';
// ============================================================
// Session State Creation
// ============================================================
export function createSessionState() {
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
// TODO Management
// ============================================================
export function addTodo(state, content, activeForm) {
    const todo = {
        id: randomUUID(),
        content,
        status: 'pending',
        activeForm,
        createdAt: new Date(),
    };
    state.todos.push(todo);
    return todo;
}
export function updateTodoStatus(state, todoId, status) {
    const todo = state.todos.find((t) => t.id === todoId);
    if (!todo)
        return false;
    todo.status = status;
    if (status === 'completed') {
        todo.completedAt = new Date();
    }
    return true;
}
export function getTodosByStatus(state, status) {
    return state.todos.filter((t) => t.status === status);
}
export function hasPendingOrInProgressTodos(state) {
    return state.todos.some((t) => t.status === 'pending' || t.status === 'in_progress');
}
export function getInProgressTodo(state) {
    return state.todos.find((t) => t.status === 'in_progress');
}
// ============================================================
// Background Task Management
// ============================================================
export function addBackgroundTask(state, agentName, description) {
    const task = {
        id: randomUUID(),
        agentName,
        description,
        status: 'running',
        startTime: new Date(),
    };
    state.backgroundTasks.push(task);
    return task;
}
export function completeBackgroundTask(state, taskId, result, failed = false) {
    const task = state.backgroundTasks.find((t) => t.id === taskId);
    if (!task)
        return false;
    task.status = failed ? 'failed' : 'completed';
    task.endTime = new Date();
    task.result = result;
    return true;
}
export function getRunningBackgroundTasks(state) {
    return state.backgroundTasks.filter((t) => t.status === 'running');
}
export function canStartNewBackgroundTask(state, maxConcurrent) {
    return getRunningBackgroundTasks(state).length < maxConcurrent;
}
// ============================================================
// Skill/Agent State
// ============================================================
export function setActiveAgent(state, agentName) {
    state.activeAgent = agentName;
}
export function setActiveSkill(state, skillName) {
    state.activeSkill = skillName;
}
export function activateRalphLoop(state) {
    state.ralphLoopActive = true;
}
export function deactivateRalphLoop(state) {
    state.ralphLoopActive = false;
}
export function activateUltrawork(state) {
    state.ultraworkActive = true;
}
export function deactivateUltrawork(state) {
    state.ultraworkActive = false;
}
export function activateAutopilot(state) {
    state.autopilotActive = true;
}
export function deactivateAutopilot(state) {
    state.autopilotActive = false;
}
// ============================================================
// Context Management
// ============================================================
export function incrementMessageCount(state) {
    state.messageCount++;
}
export function updateContextUsage(state, usage) {
    state.contextUsage = usage;
}
export function isContextWarning(state, threshold) {
    return state.messageCount >= threshold;
}
// ============================================================
// State Serialization
// ============================================================
export function serializeState(state) {
    return JSON.stringify(state, null, 2);
}
export function deserializeState(json) {
    const parsed = JSON.parse(json);
    return {
        ...parsed,
        startTime: new Date(parsed.startTime),
        todos: parsed.todos.map((t) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
        })),
        backgroundTasks: parsed.backgroundTasks.map((t) => ({
            ...t,
            startTime: new Date(t.startTime),
            endTime: t.endTime ? new Date(t.endTime) : undefined,
        })),
    };
}
