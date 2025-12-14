/**
 * GitHub CLI (gh) を使用したGitHub操作
 */

import { execSync } from "node:child_process";

interface RepoInfo {
	owner: string;
	name: string;
}

interface GitHubIssue {
	number: number;
	title: string;
	body: string;
}

/**
 * 現在のリポジトリ情報を取得
 */
export function getRepoInfo(): RepoInfo {
	const result = execSync("gh repo view --json owner,name", {
		encoding: "utf-8",
	});
	const parsed = JSON.parse(result) as { owner: { login: string }; name: string };
	return {
		owner: parsed.owner.login,
		name: parsed.name,
	};
}

/**
 * GitHub Issueを取得
 * @param issueNumber - Issue番号
 */
export function getIssue(issueNumber: number): GitHubIssue {
	const result = execSync(
		`gh issue view ${issueNumber} --json number,title,body`,
		{ encoding: "utf-8" },
	);
	return JSON.parse(result) as GitHubIssue;
}

/**
 * GitHub Issueのbodyを更新
 * @param issueNumber - Issue番号
 * @param body - 新しいbody
 */
export function updateIssueBody(issueNumber: number, body: string): void {
	// 一時ファイルに書き込んでから更新（改行やエスケープの問題を回避）
	const fs = require("node:fs");
	const os = require("node:os");
	const path = require("node:path");

	const tempFile = path.join(os.tmpdir(), `issue-body-${Date.now()}.md`);
	fs.writeFileSync(tempFile, body, "utf-8");

	try {
		execSync(`gh issue edit ${issueNumber} --body-file "${tempFile}"`, {
			encoding: "utf-8",
		});
	} finally {
		fs.unlinkSync(tempFile);
	}
}
