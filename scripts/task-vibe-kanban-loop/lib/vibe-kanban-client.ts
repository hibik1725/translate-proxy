/**
 * Vibe-Kanban MCP クライアント
 *
 * @modelcontextprotocol/sdk を使用して Vibe-Kanban MCP サーバーと通信
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
	VibeKanbanAttempt,
	VibeKanbanProject,
	VibeKanbanTask,
} from "./types.js";

/**
 * Vibe-Kanban MCP クライアント
 */
export class VibeKanbanClient {
	private client: Client;
	private transport: StdioClientTransport | null = null;
	private connected = false;

	constructor() {
		this.client = new Client({
			name: "task-vibe-kanban-loop",
			version: "1.0.0",
		});
	}

	/**
	 * MCP サーバーに接続
	 */
	async connect(): Promise<void> {
		if (this.connected) {
			return;
		}

		console.log("🔌 Vibe-Kanban MCP サーバーに接続中...");

		this.transport = new StdioClientTransport({
			command: "npx",
			args: ["-y", "vibe-kanban@latest", "--mcp"],
			env: {
				...process.env,
				RUST_LOG: "error", // DEBUGログを抑制
			},
		});

		await this.client.connect(this.transport);
		this.connected = true;

		console.log("✅ Vibe-Kanban MCP 接続完了");
	}

	/**
	 * MCP サーバーから切断
	 */
	async disconnect(): Promise<void> {
		if (!this.connected) {
			return;
		}

		console.log("🔌 Vibe-Kanban MCP サーバーから切断中...");

		await this.client.close();
		this.connected = false;

		console.log("✅ Vibe-Kanban MCP 切断完了");
	}

	/**
	 * プロジェクト一覧を取得
	 */
	async listProjects(): Promise<VibeKanbanProject[]> {
		this.ensureConnected();

		const result = await this.client.callTool({
			name: "list_projects",
			arguments: {},
		});

		const parsed = this.parseToolResult<{ projects: VibeKanbanProject[] }>(
			result,
			{ projects: [] },
		);
		return parsed.projects;
	}

	/**
	 * タスク一覧を取得
	 */
	async listTasks(projectId: string): Promise<VibeKanbanTask[]> {
		this.ensureConnected();

		const result = await this.client.callTool({
			name: "list_tasks",
			arguments: { project_id: projectId },
		});

		const parsed = this.parseToolResult<{ tasks: VibeKanbanTask[] }>(result, {
			tasks: [],
		});
		return parsed.tasks;
	}

	/**
	 * タスクを取得
	 */
	async getTask(taskId: string): Promise<VibeKanbanTask | null> {
		this.ensureConnected();

		const result = await this.client.callTool({
			name: "get_task",
			arguments: { task_id: taskId },
		});

		return this.parseToolResult<VibeKanbanTask | null>(result, null);
	}

	/**
	 * タスクを作成
	 * @returns タスクID
	 */
	async createTask(
		projectId: string,
		title: string,
		description: string,
	): Promise<string> {
		this.ensureConnected();

		const result = await this.client.callTool({
			name: "create_task",
			arguments: {
				project_id: projectId,
				title,
				description,
			},
		});

		const parsed = this.parseToolResult<{ task_id: string } | null>(
			result,
			null,
		);
		if (!parsed?.task_id) {
			throw new Error("タスクの作成に失敗しました");
		}
		return parsed.task_id;
	}

	/**
	 * タスクを更新
	 */
	async updateTask(
		taskId: string,
		status: "todo" | "inprogress" | "done",
	): Promise<void> {
		this.ensureConnected();

		await this.client.callTool({
			name: "update_task",
			arguments: {
				task_id: taskId,
				status,
			},
		});
	}

	/**
	 * タスク実行を開始
	 */
	async startTaskAttempt(
		taskId: string,
		executor: "CLAUDE_CODE",
		baseBranch: string,
	): Promise<VibeKanbanAttempt> {
		this.ensureConnected();

		const result = await this.client.callTool({
			name: "start_task_attempt",
			arguments: {
				task_id: taskId,
				executor,
				base_branch: baseBranch,
			},
		});

		const attempt = this.parseToolResult<VibeKanbanAttempt | null>(result, null);
		if (!attempt) {
			throw new Error("タスク実行の開始に失敗しました");
		}
		return attempt;
	}

	/**
	 * 接続状態を確認
	 */
	private ensureConnected(): void {
		if (!this.connected) {
			throw new Error(
				"Vibe-Kanban MCP サーバーに接続されていません。先に connect() を呼び出してください。",
			);
		}
	}

	/**
	 * ツール結果をパース
	 */
	private parseToolResult<T>(result: unknown, defaultValue: T): T {
		if (!result || typeof result !== "object") {
			return defaultValue;
		}

		const typedResult = result as {
			content?: Array<{ type: string; text?: string }>;
			structuredContent?: T;
		};

		// structuredContent がある場合はそれを使用
		if (typedResult.structuredContent !== undefined) {
			return typedResult.structuredContent;
		}

		// content から JSON をパース
		if (typedResult.content && typedResult.content.length > 0) {
			const textContent = typedResult.content.find((c) => c.type === "text");
			if (textContent?.text) {
				try {
					return JSON.parse(textContent.text) as T;
				} catch {
					// パース失敗時はデフォルト値を返す
				}
			}
		}

		return defaultValue;
	}
}
