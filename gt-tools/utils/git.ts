import { $ } from "bun";

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface BranchInfo {
  name: string;
  current: boolean;
  merged: boolean;
}

/**
 * Get current git status
 */
export async function getStatus(): Promise<GitStatus> {
  const branch = await $`git branch --show-current`.text();
  const status = await $`git status --porcelain`.text();

  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];

  for (const line of status.trim().split("\n")) {
    if (!line) continue;

    const statusCode = line.substring(0, 2);
    let file = line.substring(3);

    // Handle rename (R) and copy (C) operations which have format: "old -> new"
    // We want to track the new filename
    if (statusCode[0] === "R" || statusCode[0] === "C") {
      const arrowIndex = file.indexOf(" -> ");
      if (arrowIndex !== -1) {
        file = file.substring(arrowIndex + 4);
      }
    }

    if (statusCode[0] !== " " && statusCode[0] !== "?") {
      staged.push(file);
    }
    if (statusCode[1] !== " " && statusCode[1] !== "?") {
      unstaged.push(file);
    }
    if (statusCode === "??") {
      untracked.push(file);
    }
  }

  return {
    branch: branch.trim(),
    staged,
    unstaged,
    untracked,
  };
}

/**
 * Get staged changes diff
 */
export async function getStagedDiff(): Promise<string> {
  try {
    return await $`git diff --cached`.text();
  } catch {
    return "";
  }
}

/**
 * Get unstaged changes diff
 */
export async function getUnstagedDiff(): Promise<string> {
  try {
    return await $`git diff`.text();
  } catch {
    return "";
  }
}

/**
 * Get recent commit history
 */
export async function getRecentCommits(count: number = 5): Promise<string> {
  try {
    return await $`git log --oneline -${count}`.text();
  } catch {
    return "";
  }
}

/**
 * Create a new branch and check it out
 */
export async function createBranch(branchName: string): Promise<void> {
  await $`git checkout -b ${branchName}`.quiet();
}

/**
 * Create a commit with the given message
 */
export async function commit(message: string): Promise<void> {
  await $`git commit -m ${message}`.quiet();
}

/**
 * Stage files
 */
export async function stageFiles(files: string[]): Promise<void> {
  if (files.length === 0) return;
  await $`git add ${files}`.quiet();
}

/**
 * Get list of branches
 */
export async function getBranches(): Promise<BranchInfo[]> {
  const output = await $`git branch -a`.text();
  const branches: BranchInfo[] = [];

  for (const line of output.trim().split("\n")) {
    if (!line) continue;

    const current = line.startsWith("*");
    const name = line.replace(/^\*?\s+/, "").trim();

    branches.push({
      name,
      current,
      merged: false, // Will be filled by caller if needed
    });
  }

  return branches;
}

/**
 * Check if a branch is merged into main/master
 */
export async function isBranchMerged(branchName: string, baseBranch: string = "main"): Promise<boolean> {
  try {
    // Method 1: Check if remote branch is gone (most reliable for GitHub PR merges)
    try {
      const remoteBranches = await $`git branch -r`.text();
      const remoteExists = remoteBranches.includes(`origin/${branchName}`);

      // If remote branch is deleted, assume it was merged
      // This handles squash/rebase merges where commits are rewritten
      if (!remoteExists) {
        return true;
      }
    } catch {
      // Continue to other checks
    }

    // Method 2: Check if there are any commits in the branch not in base
    const output = await $`git log ${baseBranch}..${branchName} --oneline`.text();
    if (output.trim().length === 0) {
      return true;
    }

    // Method 3: Traditional merged check
    const mergedOutput = await $`git branch --merged ${baseBranch}`.text();
    return mergedOutput.includes(branchName);
  } catch {
    return false;
  }
}

/**
 * Delete a branch
 */
export async function deleteBranch(branchName: string, force: boolean = false): Promise<void> {
  const flag = force ? "-D" : "-d";
  await $`git branch ${flag} ${branchName}`.quiet();
}

/**
 * Get current repository info (owner/repo)
 */
export async function getRepoInfo(): Promise<{ owner: string; repo: string } | null> {
  try {
    const output = await $`gh repo view --json owner,name`.text();
    const data = JSON.parse(output);
    return {
      owner: data.owner.login,
      repo: data.name,
    };
  } catch {
    return null;
  }
}

/**
 * Get the default branch (main or master)
 */
export async function getDefaultBranch(): Promise<string> {
  try {
    // Try to get remote default branch
    const output = await $`git symbolic-ref refs/remotes/origin/HEAD`.text();
    return output.trim().replace("refs/remotes/origin/", "");
  } catch {
    // Fallback to main or master
    try {
      await $`git rev-parse --verify main`.quiet();
      return "main";
    } catch {
      return "master";
    }
  }
}

/**
 * Get commits since branch diverged from base
 */
export async function getCommitsSinceDiverge(baseBranch: string): Promise<string> {
  try {
    return await $`git log ${baseBranch}..HEAD --oneline`.text();
  } catch {
    return "";
  }
}

/**
 * Get diff since branch diverged from base
 */
export async function getDiffSinceDiverge(baseBranch: string): Promise<string> {
  try {
    return await $`git diff ${baseBranch}...HEAD`.text();
  } catch {
    return "";
  }
}

/**
 * Get PR diff using GitHub CLI
 */
export async function getPRDiff(prNumber: string): Promise<string> {
  try {
    return await $`gh pr diff ${prNumber}`.text();
  } catch (error) {
    throw new Error(`Failed to fetch PR diff: ${error}`);
  }
}

/**
 * Get PR info using GitHub CLI
 */
export async function getPRInfo(prNumber: string): Promise<{
  title: string;
  number: number;
  author: string;
  url: string;
}> {
  try {
    const output = await $`gh pr view ${prNumber} --json title,number,author,url`.text();
    const data = JSON.parse(output);
    return {
      title: data.title,
      number: data.number,
      author: data.author.login,
      url: data.url,
    };
  } catch (error) {
    throw new Error(`Failed to fetch PR info: ${error}`);
  }
}
