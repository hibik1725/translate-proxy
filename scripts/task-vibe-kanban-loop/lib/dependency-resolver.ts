/**
 * タスク依存関係の解決
 *
 * タスクグループの依存関係を解析し、実行可能なタスクを選定
 */

import type { ParsedIssue, TaskGroup } from "./types.js";

/**
 * タスク番号を比較
 * @param a - タスク番号（例: "1.2"）
 * @param b - タスク番号（例: "2.1"）
 */
function compareTaskNumbers(a: string, b: string): number {
	const [aPhase, aGroup] = a.split(".").map(Number);
	const [bPhase, bGroup] = b.split(".").map(Number);

	if (aPhase !== bPhase) {
		return aPhase - bPhase;
	}
	return aGroup - bGroup;
}

/**
 * タスク番号が最大値以下かどうかをチェック
 * @param taskId - タスク番号（例: "1.2"）
 * @param maxTaskNumber - 最大タスク番号（例: "2.1"）
 */
function isTaskInRange(taskId: string, maxTaskNumber: string | undefined): boolean {
	if (maxTaskNumber === undefined) {
		return true;
	}

	return compareTaskNumbers(taskId, maxTaskNumber) <= 0;
}

/**
 * 循環依存を検出
 * @param parsedIssue - パースされたIssue
 * @returns 循環依存のパス、または循環がなければnull
 */
export function detectCircularDependencies(
	parsedIssue: ParsedIssue,
): string[] | null {
	// 全タスクグループをマップに格納
	const taskMap = new Map<string, TaskGroup>();
	for (const phase of parsedIssue.phases) {
		for (const taskGroup of phase.taskGroups) {
			taskMap.set(taskGroup.id, taskGroup);
		}
	}

	// DFSで循環検出
	const visited = new Set<string>();
	const recursionStack = new Set<string>();
	const path: string[] = [];

	function dfs(taskId: string): boolean {
		visited.add(taskId);
		recursionStack.add(taskId);
		path.push(taskId);

		const task = taskMap.get(taskId);
		if (task) {
			for (const dep of task.dependencies) {
				if (!visited.has(dep)) {
					if (dfs(dep)) {
						return true;
					}
				} else if (recursionStack.has(dep)) {
					path.push(dep);
					return true;
				}
			}
		}

		path.pop();
		recursionStack.delete(taskId);
		return false;
	}

	for (const taskId of taskMap.keys()) {
		if (!visited.has(taskId)) {
			if (dfs(taskId)) {
				// 循環のパスを抽出
				const cycleStart = path.indexOf(path[path.length - 1]);
				return path.slice(cycleStart);
			}
		}
	}

	return null;
}

/**
 * 実行可能なタスクグループを選定
 * - 未完了
 * - 依存関係がすべて完了済み
 * - 最大タスク番号以下
 *
 * @param parsedIssue - パースされたIssue
 * @param maxTaskNumber - 最大タスク番号
 */
export async function selectExecutableTaskGroups(
	parsedIssue: ParsedIssue,
	maxTaskNumber: string | undefined,
): Promise<TaskGroup[]> {
	// 完了済みタスクIDのセット
	const completedTaskIds = new Set<string>();
	for (const phase of parsedIssue.phases) {
		for (const taskGroup of phase.taskGroups) {
			if (taskGroup.completed) {
				completedTaskIds.add(taskGroup.id);
			}
		}
	}

	const executableTasks: TaskGroup[] = [];

	for (const phase of parsedIssue.phases) {
		for (const taskGroup of phase.taskGroups) {
			// 既に完了している場合はスキップ
			if (taskGroup.completed) {
				continue;
			}

			// 範囲外の場合はスキップ
			if (!isTaskInRange(taskGroup.id, maxTaskNumber)) {
				continue;
			}

			// 依存関係がすべて完了しているか確認
			const allDepsCompleted = taskGroup.dependencies.every((dep) =>
				completedTaskIds.has(dep),
			);

			if (allDepsCompleted) {
				executableTasks.push(taskGroup);
			}
		}
	}

	// タスク番号順にソート
	executableTasks.sort((a, b) => compareTaskNumbers(a.id, b.id));

	return executableTasks;
}

/**
 * すべてのタスクが完了しているかチェック
 * @param parsedIssue - パースされたIssue
 * @param maxTaskNumber - 最大タスク番号
 */
export function isAllTasksCompleted(
	parsedIssue: ParsedIssue,
	maxTaskNumber: string | undefined,
): boolean {
	for (const phase of parsedIssue.phases) {
		for (const taskGroup of phase.taskGroups) {
			// 範囲内で未完了のタスクがあれば false
			if (isTaskInRange(taskGroup.id, maxTaskNumber) && !taskGroup.completed) {
				return false;
			}
		}
	}
	return true;
}
