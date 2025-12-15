#!/usr/bin/env tsx
/**
 * タスク自動実行ループ
 *
 * GitHub Issue からタスクを取得し、Vibe-Kanban に登録して実行を継続するループ
 *
 * 使用方法:
 *   pnpm task:loop <issue-number> [--max <number>] [--base <branch>]
 */

import { parseArgs } from "./lib/args-parser.js";
import {
	ensureIssueBranchWithoutCheckout,
	ensurePhaseBranchWithoutCheckout,
	getPhaseBranchName,
} from "./lib/branch-manager.js";
import {
	detectCircularDependencies,
	isAllTasksCompleted,
	selectExecutableTaskGroups,
} from "./lib/dependency-resolver.js";
import { getIssue, getRepoInfo } from "./lib/github-client.js";
import { parseIssueBody } from "./lib/issue-parser.js";
import {
	TaskStateManager,
	generateVibeKanbanDescription,
	generateVibeKanbanTitle,
} from "./lib/task-state-manager.js";
import type { ParsedIssue, TaskGroup } from "./lib/types.js";
import { VibeKanbanClient } from "./lib/vibe-kanban-client.js";

/** ポーリング間隔（ミリ秒） */
const POLLING_INTERVAL_MS = 15_000;

/**
 * 待機関数
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
	// 引数解析
	const args = parseArgs(process.argv.slice(2));
	if (!args) {
		process.exit(1);
	}

	console.log("\n🚀 タスク自動実行ループ開始\n");

	// 設定表示
	const repoInfo = getRepoInfo();
	const baseBranch = args.baseBranch ?? "main";

	console.log("📋 設定:");
	console.log(`  - Issue番号: #${args.issueNumber}`);
	console.log(`  - 最大タスク番号: ${args.maxTaskNumber ?? "all"}`);
	console.log(`  - ベースブランチ: ${baseBranch}`);
	console.log(`  - リポジトリ: ${repoInfo.owner}/${repoInfo.name}`);
	console.log("");

	// GitHub Issue 取得・解析
	console.log("📥 GitHub Issue を取得中...");
	const issue = getIssue(args.issueNumber);
	let parsedIssue = parseIssueBody(issue);

	// 循環依存チェック
	const cycle = detectCircularDependencies(parsedIssue);
	if (cycle) {
		console.error("\n❌ エラー: タスクグループの循環依存を検出しました");
		console.error(`循環依存パス: ${cycle.join(" → ")}`);
		process.exit(1);
	}

	console.log(`✅ Issue 取得完了: ${parsedIssue.title}`);
	console.log(
		`   Phase 数: ${parsedIssue.phases.length}, タスクグループ数: ${parsedIssue.phases.reduce((sum, p) => sum + p.taskGroups.length, 0)}`,
	);
	console.log("");

	// Issue ブランチを作成（チェックアウトなし）
	console.log("🌿 ブランチを準備中...");
	const issueBranch = ensureIssueBranchWithoutCheckout(
		args.issueNumber,
		baseBranch,
	);

	// Phase ブランチを事前に作成（必要な Phase のみ、チェックアウトなし）
	const requiredPhases = new Set<number>();
	for (const phase of parsedIssue.phases) {
		for (const tg of phase.taskGroups) {
			requiredPhases.add(tg.phaseNumber);
		}
	}
	for (const phaseNumber of Array.from(requiredPhases).sort((a, b) => a - b)) {
		ensurePhaseBranchWithoutCheckout(args.issueNumber, phaseNumber, issueBranch);
	}
	console.log("");

	// Vibe-Kanban 接続
	const vibeKanban = new VibeKanbanClient();
	await vibeKanban.connect();

	// プロジェクト ID 取得（現在のgitリポジトリに一致するプロジェクトを選択）
	console.log("\n📦 Vibe-Kanban プロジェクトを取得中...");
	const projects = await vibeKanban.listProjects();
	if (projects.length === 0) {
		console.error("❌ エラー: Vibe-Kanban プロジェクトが見つかりません");
		console.error("   npx vibe-kanban を起動し、プロジェクトを作成してください");
		await vibeKanban.disconnect();
		process.exit(1);
	}

	// 現在のディレクトリに一致するプロジェクトを選択
	const currentDir = process.cwd();
	const matchingProject = projects.find((p) => p.git_repo_path === currentDir);
	if (!matchingProject) {
		const projectList =
			projects.length === 0
				? "   （なし）"
				: projects
						.map((p) => `   • ${p.name}\n     ${p.git_repo_path}`)
						.join("\n");

		console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ プロジェクトが Vibe-Kanban に登録されていません              ║
╚══════════════════════════════════════════════════════════════════╝

📍 現在のディレクトリ:
   ${currentDir}

📦 登録済みプロジェクト:
${projectList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 解決方法:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Step 1: Vibe-Kanban を起動
  ─────────────────────────────────────────
  $ npx vibe-kanban

  Step 2: ブラウザで Projects ページを開く
  ─────────────────────────────────────────
  自動でブラウザが開きます。開かない場合は:
  http://localhost:<port>/projects

  Step 3: プロジェクトを登録
  ─────────────────────────────────────────
  「Create project」ボタンをクリックし、
  以下のパスを Git Repository Path に入力:
  ${currentDir}

  Step 4: 再度このコマンドを実行
  ─────────────────────────────────────────
  $ pnpm task:loop ${args.issueNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
		await vibeKanban.disconnect();
		process.exit(1);
	}

	const projectId = matchingProject.id;
	console.log(`✅ プロジェクト: ${matchingProject.name} (${projectId})`);

	// タスク状態マネージャー初期化
	const stateManager = new TaskStateManager();

	// 既存の Vibe-Kanban タスクを取得して初期化
	const existingTasks = await vibeKanban.listTasks(projectId);
	stateManager.initializeDoneTaskIds(existingTasks);

	// 既存タスクのマッピングを登録
	for (const task of existingTasks) {
		const match = task.title.match(/\/task-exec\s+(\d+\.\d+)/);
		if (match) {
			stateManager.registerTaskMapping(task.id, match[1]);
		}
	}

	try {
		// 初期化: 着手可能なタスクを全部 Doing に移す
		console.log("\n🔍 着手可能なタスクを選定中...");
		await startExecutableTasks(
			parsedIssue,
			args.maxTaskNumber,
			args.issueNumber,
			projectId,
			vibeKanban,
			stateManager,
		);

		// メインループ
		let loopCount = 0;
		while (true) {
			loopCount++;
			console.log(`\n🔄 ポーリング #${loopCount}`);

			// Vibe-Kanban のタスク状態を取得
			const currentTasks = await vibeKanban.listTasks(projectId);

			// Done 増加を検知
			const newlyCompletedVibeTaskIds =
				stateManager.detectNewlyCompletedTasks(currentTasks);

			if (newlyCompletedVibeTaskIds.length > 0) {
				console.log(
					`✅ 新たに完了したタスク: ${newlyCompletedVibeTaskIds.length} 件`,
				);

				// タスクグループ ID を取得
				const completedTaskGroupIds = stateManager.getCompletedTaskGroupIds(
					newlyCompletedVibeTaskIds,
				);

				// GitHub Issue のチェックボックスを更新
				parsedIssue = await stateManager.markTaskGroupsAsCompleted(
					args.issueNumber,
					completedTaskGroupIds,
				);

				// 新たに着手可能になったタスクを開始
				await startExecutableTasks(
					parsedIssue,
					args.maxTaskNumber,
					args.issueNumber,
					projectId,
					vibeKanban,
					stateManager,
				);
			}

			// 全タスク完了チェック
			if (isAllTasksCompleted(parsedIssue, args.maxTaskNumber)) {
				console.log("\n🎉 すべてのタスクが完了しました！");
				break;
			}

			// 待機
			console.log(`   ⏳ ${POLLING_INTERVAL_MS / 1000}秒待機...`);
			await sleep(POLLING_INTERVAL_MS);
		}
	} finally {
		// Vibe-Kanban 切断
		await vibeKanban.disconnect();
	}

	console.log("\n✅ タスク自動実行ループ終了\n");
}

/**
 * 着手可能なタスクを Vibe-Kanban に登録して実行開始
 */
async function startExecutableTasks(
	parsedIssue: ParsedIssue,
	maxTaskNumber: string | undefined,
	issueNumber: number,
	projectId: string,
	vibeKanban: VibeKanbanClient,
	stateManager: TaskStateManager,
): Promise<void> {
	// 着手可能なタスクグループを選定
	const executableGroups = await selectExecutableTaskGroups(
		parsedIssue,
		maxTaskNumber,
	);

	if (executableGroups.length === 0) {
		console.log("   ⏸️  着手可能なタスクがありません");
		return;
	}

	console.log(`   📝 着手可能なタスク: ${executableGroups.length} 件`);

	// 既存の Vibe-Kanban タスクを取得
	const existingTasks = await vibeKanban.listTasks(projectId);
	const existingTitles = new Set(existingTasks.map((t) => t.title));

	// 各タスクグループを Vibe-Kanban に登録
	for (const taskGroup of executableGroups) {
		const title = generateVibeKanbanTitle(taskGroup);

		// 既に存在する場合はスキップ
		if (existingTitles.has(title)) {
			console.log(`   ⏭️  既存タスクをスキップ: ${taskGroup.id}`);
			continue;
		}

		const description = generateVibeKanbanDescription(taskGroup, issueNumber);

		// タスク作成
		console.log(`   📌 タスク作成: ${taskGroup.id} - ${taskGroup.name}`);
		const taskId = await vibeKanban.createTask(projectId, title, description);

		// マッピング登録
		stateManager.registerTaskMapping(taskId, taskGroup.id);

		// ステータスを inprogress に更新
		await vibeKanban.updateTask(taskId, "inprogress");

		// タスク実行開始（Phase ブランチをベースに使用）
		const phaseBranch = getPhaseBranchName(issueNumber, taskGroup.phaseNumber);
		try {
			const attempt = await vibeKanban.startTaskAttempt(
				taskId,
				"CLAUDE_CODE",
				phaseBranch,
			);
			console.log(
				`   ▶️  タスク開始: ${taskGroup.id} (base: ${phaseBranch}, attempt: ${attempt?.id ?? "unknown"})`,
			);
		} catch (error) {
			console.error(`   ❌ Attempt開始失敗: ${taskGroup.id}`, error);
		}
	}
}

// エントリポイント
main().catch((error) => {
	console.error("\n❌ エラーが発生しました:", error);
	process.exit(1);
});
