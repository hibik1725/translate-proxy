/**
 * タスク状態管理
 *
 * Vibe-KanbanとGitHub Issueの状態を同期
 */

import { getIssue, updateIssueBody } from "./github-client.js";
import { parseIssueBody, updateCheckboxes } from "./issue-parser.js";
import type { ParsedIssue, TaskGroup, VibeKanbanTask } from "./types.js";

/**
 * タスク状態マネージャー
 */
export class TaskStateManager {
	/** Vibe-KanbanタスクID → タスクグループID のマッピング */
	private vibeTaskToGroupId = new Map<string, string>();

	/** 前回のDoneタスクIDセット */
	private previousDoneTaskIds = new Set<string>();

	/**
	 * Vibe-KanbanタスクIDとタスクグループIDのマッピングを登録
	 */
	registerTaskMapping(vibeTaskId: string, taskGroupId: string): void {
		this.vibeTaskToGroupId.set(vibeTaskId, taskGroupId);
	}

	/**
	 * 既存のDoneタスクを初期化
	 */
	initializeDoneTaskIds(tasks: VibeKanbanTask[]): void {
		for (const task of tasks) {
			if (task.status === "done") {
				this.previousDoneTaskIds.add(task.id);
			}
		}
	}

	/**
	 * 新たにDoneになったタスクを検出
	 * @returns 新たにDoneになったVibe-KanbanタスクIDの配列
	 */
	detectNewlyCompletedTasks(currentTasks: VibeKanbanTask[]): string[] {
		const newlyCompleted: string[] = [];

		for (const task of currentTasks) {
			if (task.status === "done" && !this.previousDoneTaskIds.has(task.id)) {
				newlyCompleted.push(task.id);
				this.previousDoneTaskIds.add(task.id);
			}
		}

		return newlyCompleted;
	}

	/**
	 * Vibe-KanbanタスクIDからタスクグループIDを取得
	 */
	getCompletedTaskGroupIds(vibeTaskIds: string[]): string[] {
		const groupIds: string[] = [];

		for (const vibeTaskId of vibeTaskIds) {
			const groupId = this.vibeTaskToGroupId.get(vibeTaskId);
			if (groupId) {
				groupIds.push(groupId);
			}
		}

		return groupIds;
	}

	/**
	 * GitHub Issueのチェックボックスを更新
	 * @returns 更新後のパースされたIssue
	 */
	async markTaskGroupsAsCompleted(
		issueNumber: number,
		taskGroupIds: string[],
	): Promise<ParsedIssue> {
		if (taskGroupIds.length === 0) {
			const issue = getIssue(issueNumber);
			return parseIssueBody(issue);
		}

		// 現在のIssueを取得
		const issue = getIssue(issueNumber);

		// チェックボックスを更新
		const updatedBody = updateCheckboxes(issue.body, taskGroupIds);

		// Issueを更新
		updateIssueBody(issueNumber, updatedBody);

		console.log(
			`   📝 GitHub Issue更新: ${taskGroupIds.join(", ")} を完了にマーク`,
		);

		// 更新後のIssueを再取得してパース
		const updatedIssue = getIssue(issueNumber);
		return parseIssueBody(updatedIssue);
	}
}

/**
 * Vibe-Kanban用のタスクタイトルを生成
 */
export function generateVibeKanbanTitle(taskGroup: TaskGroup): string {
	return `/task-exec ${taskGroup.id} ${taskGroup.name}`;
}

/**
 * Vibe-Kanban用のタスク説明を生成
 */
export function generateVibeKanbanDescription(
	taskGroup: TaskGroup,
	issueNumber: number,
): string {
	const lines: string[] = [
		`## タスク ${taskGroup.id}: ${taskGroup.name}`,
		"",
		`**Issue**: #${issueNumber}`,
		"",
	];

	if (taskGroup.description) {
		lines.push("### 詳細", "");
		lines.push(taskGroup.description);
		lines.push("");
	}

	if (taskGroup.dependencies.length > 0) {
		lines.push(`**依存関係**: ${taskGroup.dependencies.join(", ")}`);
	} else {
		lines.push("**依存関係**: なし");
	}

	return lines.join("\n");
}
