/**
 * GitHub Issue本文のパース
 *
 * Issue本文からタスク一覧を抽出する
 */

import type { ParsedIssue, Phase, TaskGroup } from "./types.js";

interface RawIssue {
	title: string;
	body: string;
}

/**
 * Issue本文をパースしてタスク一覧を抽出
 * @param issue - GitHub Issue
 */
export function parseIssueBody(issue: RawIssue): ParsedIssue {
	const phases: Phase[] = [];
	const lines = issue.body.split("\n");

	let currentPhase: Phase | null = null;
	let currentTaskGroup: TaskGroup | null = null;
	let inTaskList = false;

	for (const line of lines) {
		// フェーズヘッダーの検出（## フェーズ1: xxx または ## Phase 1: xxx）
		const phaseMatch = line.match(
			/^##\s*(?:フェーズ|Phase)\s*(\d+)(?:-\d+)?[:\s]+(.+)/i,
		);
		if (phaseMatch) {
			const phaseNumber = Number.parseInt(phaseMatch[1], 10);
			const phaseName = phaseMatch[2].trim();

			// 既存のフェーズを探す
			let existingPhase = phases.find((p) => p.number === phaseNumber);
			if (!existingPhase) {
				existingPhase = {
					number: phaseNumber,
					name: phaseName,
					taskGroups: [],
				};
				phases.push(existingPhase);
			}
			currentPhase = existingPhase;
			currentTaskGroup = null;
			inTaskList = true;
			continue;
		}

		// タスクグループ（チェックボックス）の検出
		// - [ ] 1.1 タスク名 または - [x] 1.1 タスク名
		const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(\d+\.\d+)\s+(.+)/);
		if (taskMatch && currentPhase) {
			const completed = taskMatch[1].toLowerCase() === "x";
			const taskId = taskMatch[2];
			const taskName = taskMatch[3].trim();
			const [phaseNum, groupNum] = taskId.split(".").map(Number);

			currentTaskGroup = {
				id: taskId,
				phaseNumber: phaseNum,
				groupNumber: groupNum,
				name: taskName,
				description: "",
				dependencies: [],
				completed,
			};
			currentPhase.taskGroups.push(currentTaskGroup);
			continue;
		}

		// 依存関係の検出（_依存関係: 1.1, 1.2_ または _依存: なし_）
		const depMatch = line.match(/[_*]依存(?:関係)?[:\s]*([^_*]+)[_*]/);
		if (depMatch && currentTaskGroup) {
			const deps = depMatch[1].trim();
			if (deps !== "なし" && deps !== "none" && deps !== "-") {
				currentTaskGroup.dependencies = deps
					.split(/[,、\s]+/)
					.map((d) => d.trim())
					.filter((d) => /^\d+\.\d+$/.test(d));
			}
			continue;
		}

		// タスク詳細の検出（インデントされた行）
		if (currentTaskGroup && line.match(/^\s{2,}-\s+/)) {
			const detail = line.replace(/^\s+-\s+/, "").trim();
			if (detail && !detail.startsWith("_")) {
				if (currentTaskGroup.description) {
					currentTaskGroup.description += "\n";
				}
				currentTaskGroup.description += detail;
			}
		}
	}

	// フェーズを番号順にソート
	phases.sort((a, b) => a.number - b.number);

	return {
		title: issue.title,
		phases,
	};
}

/**
 * パースされたIssueからタスクグループIDを使ってチェックボックスを更新
 * @param originalBody - 元のIssue本文
 * @param completedTaskIds - 完了したタスクグループIDの配列
 */
export function updateCheckboxes(
	originalBody: string,
	completedTaskIds: string[],
): string {
	const completedSet = new Set(completedTaskIds);
	const lines = originalBody.split("\n");

	const updatedLines = lines.map((line) => {
		// チェックボックス行の検出
		const match = line.match(/^(-\s*\[)([ xX])(\]\s*)(\d+\.\d+)(.*)$/);
		if (match) {
			const taskId = match[4];
			if (completedSet.has(taskId)) {
				return `${match[1]}x${match[3]}${match[4]}${match[5]}`;
			}
		}
		return line;
	});

	return updatedLines.join("\n");
}
