/**
 * ブランチ管理ユーティリティ
 *
 * Issue/Phaseごとのブランチ作成と管理
 */

import { execSync } from "node:child_process";

/**
 * Issueブランチ名を生成
 * @param issueNumber - Issue番号
 */
export function getIssueBranchName(issueNumber: number): string {
	return `issue/${issueNumber}`;
}

/**
 * Phaseブランチ名を生成
 * @param issueNumber - Issue番号
 * @param phaseNumber - フェーズ番号
 */
export function getPhaseBranchName(
	issueNumber: number,
	phaseNumber: number,
): string {
	return `issue/${issueNumber}-phase${phaseNumber}`;
}

/**
 * ブランチが存在するか確認
 * @param branchName - ブランチ名
 */
function branchExists(branchName: string): boolean {
	try {
		execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, {
			encoding: "utf-8",
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * リモートブランチが存在するか確認
 * @param branchName - ブランチ名
 */
function remoteBranchExists(branchName: string): boolean {
	try {
		execSync(`git show-ref --verify --quiet refs/remotes/origin/${branchName}`, {
			encoding: "utf-8",
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Issueブランチを作成（チェックアウトなし）
 * @param issueNumber - Issue番号
 * @param baseBranch - ベースブランチ名
 * @returns 作成したブランチ名
 */
export function ensureIssueBranchWithoutCheckout(
	issueNumber: number,
	baseBranch: string,
): string {
	const branchName = getIssueBranchName(issueNumber);

	// 既に存在する場合はスキップ
	if (branchExists(branchName) || remoteBranchExists(branchName)) {
		console.log(`   ✅ Issueブランチ存在: ${branchName}`);
		return branchName;
	}

	// リモートからフェッチ
	execSync("git fetch origin", { encoding: "utf-8" });

	// ブランチ作成（チェックアウトなし）
	execSync(`git branch ${branchName} origin/${baseBranch}`, {
		encoding: "utf-8",
	});

	// プッシュ
	execSync(`git push -u origin ${branchName}`, { encoding: "utf-8" });

	console.log(`   🌿 Issueブランチ作成: ${branchName}`);
	return branchName;
}

/**
 * Phaseブランチを作成（チェックアウトなし）
 * @param issueNumber - Issue番号
 * @param phaseNumber - フェーズ番号
 * @param issueBranch - Issueブランチ名
 * @returns 作成したブランチ名
 */
export function ensurePhaseBranchWithoutCheckout(
	issueNumber: number,
	phaseNumber: number,
	issueBranch: string,
): string {
	const branchName = getPhaseBranchName(issueNumber, phaseNumber);

	// 既に存在する場合はスキップ
	if (branchExists(branchName) || remoteBranchExists(branchName)) {
		console.log(`   ✅ Phaseブランチ存在: ${branchName}`);
		return branchName;
	}

	// リモートからフェッチ
	execSync("git fetch origin", { encoding: "utf-8" });

	// ベースブランチの決定（リモートがあればリモートを使用）
	const base = remoteBranchExists(issueBranch)
		? `origin/${issueBranch}`
		: issueBranch;

	// ブランチ作成（チェックアウトなし）
	execSync(`git branch ${branchName} ${base}`, { encoding: "utf-8" });

	// プッシュ
	execSync(`git push -u origin ${branchName}`, { encoding: "utf-8" });

	console.log(`   🌿 Phaseブランチ作成: ${branchName}`);
	return branchName;
}
