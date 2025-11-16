import { getStatus, getStagedDiff, getRecentCommits, createBranch, commit } from "../utils/git";
import { suggestBranchAndCommit } from "../utils/claude";
import { previewAndConfirm } from "../utils/prompts";
import { logActivity } from "../utils/logger";

export async function branchCommit() {
  const startTime = Date.now();
  console.log("\n🌿 Branch and Commit Workflow\n");

  // Step 1: Check for staged changes
  const status = await getStatus();

  if (status.staged.length === 0) {
    console.error("❌ No staged changes found. Please stage your changes first with 'git add'.");
    await logActivity({
      command: "branch-commit",
      success: false,
      errorMessage: "No staged changes found",
      durationMs: Date.now() - startTime,
    });
    process.exit(1);
  }

  console.log(`✓ Found ${status.staged.length} staged file(s)`);
  console.log(`  Current branch: ${status.branch}\n`);

  // Step 2: Get staged diff and recent commits
  console.log("📊 Analyzing changes...");
  const diff = await getStagedDiff();
  const recentCommits = await getRecentCommits();

  // Step 3: Ask Claude for suggestions
  console.log("🤖 Generating branch name and commit message...\n");

  let suggestions;
  try {
    suggestions = await suggestBranchAndCommit(diff, recentCommits);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "branch-commit",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      filesChanged: status.staged.length,
    });
    process.exit(1);
  }

  // Add pdrm/ prefix to branch name
  const fullBranchName = `pdrm/${suggestions.branchName}`;

  // Step 4: Show preview and get confirmation
  const preview = `Branch: ${fullBranchName}
Commit: ${suggestions.commitMessage}

Staged files:
${status.staged.map((f) => `  - ${f}`).join("\n")}`;

  const confirmed = await previewAndConfirm(
    "📋 Preview",
    preview,
    "Create this branch and commit?"
  );

  if (!confirmed) {
    console.log("\n❌ Cancelled.");
    await logActivity({
      command: "branch-commit",
      success: false,
      errorMessage: "User cancelled",
      durationMs: Date.now() - startTime,
      branchName: fullBranchName,
      commitMessage: suggestions.commitMessage,
      filesChanged: status.staged.length,
      userInput: { confirmed: false },
    });
    process.exit(0);
  }

  // Step 5: Create branch and commit
  console.log("\n⚙️  Creating branch and committing...");

  try {
    await createBranch(fullBranchName);
    console.log(`✓ Created and checked out branch: ${fullBranchName}`);

    await commit(suggestions.commitMessage);
    console.log(`✓ Committed changes: ${suggestions.commitMessage}`);

    console.log("\n✅ Done! Your changes have been committed to the new branch.");

    await logActivity({
      command: "branch-commit",
      success: true,
      durationMs: Date.now() - startTime,
      branchName: fullBranchName,
      commitMessage: suggestions.commitMessage,
      filesChanged: status.staged.length,
      userInput: { confirmed: true },
    });
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "branch-commit",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      branchName: fullBranchName,
      commitMessage: suggestions.commitMessage,
      filesChanged: status.staged.length,
    });
    process.exit(1);
  }
}
