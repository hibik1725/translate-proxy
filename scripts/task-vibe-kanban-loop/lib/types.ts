/**
 * Vibe-Kanban連携用の型定義
 */

/**
 * コマンドライン引数
 */
export interface LoopArgs {
	/** Issue番号 */
	issueNumber: number;
	/** 最大タスク番号（例: "4", "4.2", undefined=all） */
	maxTaskNumber: string | undefined;
	/** ベースブランチ名 */
	baseBranch: string | undefined;
}

/**
 * Vibe-Kanban プロジェクト
 */
export interface VibeKanbanProject {
	id: string;
	name: string;
	git_repo_path: string;
}

/**
 * Vibe-Kanban タスク
 */
export interface VibeKanbanTask {
	id: string;
	title: string;
	description: string;
	status: "todo" | "inprogress" | "inreview" | "done";
	project_id: string;
}

/**
 * Vibe-Kanban タスク実行
 */
export interface VibeKanbanAttempt {
	id: string;
	task_id: string;
	status: string;
	branch_name: string;
}

/**
 * パースされたIssue
 */
export interface ParsedIssue {
	title: string;
	phases: Phase[];
}

/**
 * フェーズ
 */
export interface Phase {
	number: number;
	name: string;
	taskGroups: TaskGroup[];
}

/**
 * タスクグループ
 */
export interface TaskGroup {
	/** タスクグループID（例: "1.1", "2.3"） */
	id: string;
	/** フェーズ番号 */
	phaseNumber: number;
	/** グループ番号 */
	groupNumber: number;
	/** タスク名 */
	name: string;
	/** タスク詳細 */
	description: string;
	/** 依存するタスクグループID */
	dependencies: string[];
	/** 完了済みかどうか */
	completed: boolean;
}
