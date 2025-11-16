import { $ } from "bun";
import {
  getStatus,
  getDefaultBranch,
  getCommitsSinceDiverge,
  getDiffSinceDiverge,
} from "../utils/git";
import { suggestPRDescription } from "../utils/claude";
import { previewAndConfirm } from "../utils/prompts";
import { logActivity } from "../utils/logger";

export async function createPR() {
  const startTime = Date.now();
  console.log("\n🔀 Create Pull Request\n");

  // Step 1: Check current branch
  const status = await getStatus();
  const defaultBranch = await getDefaultBranch();

  if (status.branch === defaultBranch || status.branch === "main" || status.branch === "master") {
    console.error(`❌ You are currently on '${status.branch}'. Please create a feature branch first.`);
    await logActivity({
      command: "create-pr",
      success: false,
      errorMessage: "On default branch, need feature branch",
      durationMs: Date.now() - startTime,
      branchName: status.branch,
    });
    process.exit(1);
  }

  console.log(`Current branch: ${status.branch}`);
  console.log(`Base branch: ${defaultBranch}\n`);

  // Step 2: Check if branch is pushed to remote
  console.log("🔍 Checking remote status...");

  let needsPush = false;
  try {
    await $`git rev-parse --abbrev-ref ${status.branch}@{upstream}`.quiet();
    console.log("✓ Branch is pushed to remote\n");
  } catch {
    needsPush = true;
    console.log("⚠️  Branch not pushed to remote yet\n");
  }

  // Step 3: Get commits and diff since diverged
  console.log("📊 Analyzing changes...");

  const commits = await getCommitsSinceDiverge(defaultBranch);
  const diff = await getDiffSinceDiverge(defaultBranch);

  if (!commits.trim()) {
    console.error(`❌ No commits found. Your branch is up to date with '${defaultBranch}'.`);
    await logActivity({
      command: "create-pr",
      success: false,
      errorMessage: "No commits found",
      durationMs: Date.now() - startTime,
      branchName: status.branch,
    });
    process.exit(1);
  }

  const commitLines = commits.trim().split("\n");
  console.log(`✓ Found ${commitLines.length} commit(s)\n`);

  // Step 4: Ask Claude to generate PR description
  console.log("🤖 Generating PR description...\n");

  let prData;
  try {
    prData = await suggestPRDescription(commits, diff);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "create-pr",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      branchName: status.branch,
    });
    process.exit(1);
  }

  // Step 5: Show preview
  const preview = `Title: ${prData.title}

Description:
${prData.description}

Commits (${commitLines.length}):
${commits}`;

  const confirmed = await previewAndConfirm("📋 PR Preview", preview, "Create this pull request?");

  if (!confirmed) {
    console.log("\n❌ Cancelled.");
    await logActivity({
      command: "create-pr",
      success: false,
      errorMessage: "User cancelled",
      durationMs: Date.now() - startTime,
      branchName: status.branch,
      prTitle: prData.title,
      userInput: { confirmed: false },
    });
    process.exit(0);
  }

  // Step 6: Push branch if needed
  if (needsPush) {
    console.log("\n⬆️  Pushing branch to remote...");
    try {
      await $`git push -u origin ${status.branch}`.quiet();
      console.log("✓ Branch pushed");
    } catch (error) {
      console.error(`❌ Failed to push branch: ${error instanceof Error ? error.message : String(error)}`);
      await logActivity({
        command: "create-pr",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
        branchName: status.branch,
        prTitle: prData.title,
      });
      process.exit(1);
    }
  }

  // Step 7: Create PR using gh CLI
  console.log("\n🔀 Creating pull request...");

  try {
    const prUrl = await $`gh pr create --title ${prData.title} --body ${prData.description} --base ${defaultBranch}`.text();
    console.log(`\n✅ Pull request created!`);
    console.log(prUrl.trim());

    await logActivity({
      command: "create-pr",
      success: true,
      durationMs: Date.now() - startTime,
      branchName: status.branch,
      prTitle: prData.title,
      prUrl: prUrl.trim(),
      metadata: { commitCount: commitLines.length, baseBranch: defaultBranch },
    });
  } catch (error) {
    console.error(`❌ Failed to create PR: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "create-pr",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      branchName: status.branch,
      prTitle: prData.title,
    });
    process.exit(1);
  }
}
