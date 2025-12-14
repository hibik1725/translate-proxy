/**
 * コマンドライン引数解析
 *
 * 使用例:
 *   pnpm task:loop 123
 *   pnpm task:loop 123 --max 4.2
 *   pnpm task:loop 123 --max 4.2 --base develop
 */

import minimist from "minimist";
import type { LoopArgs } from "./types.js";

interface ParsedArgs {
	_: (string | number)[];
	max?: string;
	base?: string;
	help?: boolean;
	h?: boolean;
}

/**
 * 使用方法を表示
 */
function printUsage(): void {
	console.log(`
使用方法: pnpm task:loop <issue-number> [options]

引数:
  <issue-number>    GitHub Issue 番号（必須）

オプション:
  --max <number>    最大タスク番号（例: 4, 4.2, all）
                    省略時は全タスクを実行
  --base <branch>   ベースブランチ名（例: main, develop）
                    省略時はリモートのデフォルトブランチを使用
  -h, --help        このヘルプを表示

例:
  pnpm task:loop 123                  # Issue #123 の全タスクを実行
  pnpm task:loop 123 --max 4          # Phase 4 まで実行
  pnpm task:loop 123 --max 4.2        # タスクグループ 4.2 まで実行
  pnpm task:loop 123 --base develop   # develop ブランチベースで実行
`);
}

/**
 * コマンドライン引数を解析
 * @param argv - process.argv.slice(2)
 * @returns パースされた引数、またはエラー時はnull
 */
export function parseArgs(argv: string[]): LoopArgs | null {
	const args = minimist(argv, {
		string: ["max", "base"],
		boolean: ["help", "h"],
		alias: { h: "help" },
	}) as ParsedArgs;

	// ヘルプ表示
	if (args.help || args.h) {
		printUsage();
		return null;
	}

	// Issue番号の取得
	const issueArg = args._[0];
	if (issueArg === undefined) {
		console.error("エラー: Issue番号を指定してください\n");
		printUsage();
		return null;
	}

	const issueNumber = Number(issueArg);
	if (Number.isNaN(issueNumber) || issueNumber <= 0) {
		console.error(`エラー: 無効なIssue番号です: ${issueArg}\n`);
		printUsage();
		return null;
	}

	// maxタスク番号のバリデーション
	const maxTaskNumber = args.max;
	if (maxTaskNumber !== undefined && maxTaskNumber !== "all") {
		const parts = maxTaskNumber.split(".");
		if (parts.length > 2) {
			console.error(`エラー: 無効なタスク番号形式です: ${maxTaskNumber}\n`);
			printUsage();
			return null;
		}
		for (const part of parts) {
			const num = Number(part);
			if (Number.isNaN(num) || num <= 0) {
				console.error(`エラー: 無効なタスク番号です: ${maxTaskNumber}\n`);
				printUsage();
				return null;
			}
		}
	}

	return {
		issueNumber,
		maxTaskNumber: maxTaskNumber === "all" ? undefined : maxTaskNumber,
		baseBranch: args.base,
	};
}
