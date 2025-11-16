import {
  getStatus,
  getStagedDiff,
  getUnstagedDiff,
  getRecentCommits,
  stageFiles,
  commit,
} from "../utils/git";
import { suggestCommitMessage } from "../utils/claude";
import { previewAndConfirm } from "../utils/prompts";
import { logActivity } from "../utils/logger";

export async function smartCommit(type?: string, message?: string) {
  const startTime = Date.now();
  console.log("\n💡 Smart Commit Workflow\n");

  // Step 1: Check for changes
  const status = await getStatus();

  const hasStaged = status.staged.length > 0;
  const hasUnstaged = status.unstaged.length > 0;

  if (!hasStaged && !hasUnstaged) {
    console.error("❌ No changes found. Nothing to commit.");
    await logActivity({
      command: "smart-commit",
      success: false,
      errorMessage: "No changes found",
      durationMs: Date.now() - startTime,
    });
    process.exit(1);
  }

  // Step 2: Determine what to commit
  let filesToCommit: string[] = [];
  let diff = "";

  if (hasStaged) {
    console.log(`✓ Found ${status.staged.length} staged file(s)`);
    filesToCommit = status.staged;
    diff = await getStagedDiff();
  } else {
    console.log(`✓ Found ${status.unstaged.length} unstaged file(s)`);
    filesToCommit = status.unstaged;
    diff = await getUnstagedDiff();
  }

  // If user provided type and message, use those directly
  if (type && message) {
    const commitMessage = `${type}: ${message}`;

    const preview = `Commit: ${commitMessage}

Files to commit:
${filesToCommit.map((f) => `  - ${f}`).join("\n")}`;

    const confirmed = await previewAndConfirm("📋 Preview", preview, "Create this commit?");

    if (!confirmed) {
      console.log("\n❌ Cancelled.");
      await logActivity({
        command: "smart-commit",
        success: false,
        errorMessage: "User cancelled",
        durationMs: Date.now() - startTime,
        commitMessage,
        filesChanged: filesToCommit.length,
        userInput: { type, message, confirmed: false },
      });
      process.exit(0);
    }

    // Stage files if needed
    if (!hasStaged) {
      await stageFiles(filesToCommit);
      console.log("✓ Staged files");
    }

    await commit(commitMessage);
    console.log(`\n✅ Committed: ${commitMessage}`);

    await logActivity({
      command: "smart-commit",
      success: true,
      durationMs: Date.now() - startTime,
      commitMessage,
      filesChanged: filesToCommit.length,
      userInput: { type, message, confirmed: true, aiGenerated: false },
    });
    return;
  }

  // Step 3: Get recent commits for style reference
  console.log("📊 Analyzing changes...");
  const recentCommits = await getRecentCommits();

  // Step 4: Ask Claude for suggestion
  console.log("🤖 Generating commit message...\n");

  let commitMessage: string;
  try {
    commitMessage = await suggestCommitMessage(diff, recentCommits, type);
    commitMessage = commitMessage.trim();
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "smart-commit",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      filesChanged: filesToCommit.length,
      userInput: { type },
    });
    process.exit(1);
  }

  // Step 5: Show preview and get confirmation
  const preview = `Commit: ${commitMessage}

Files to commit:
${filesToCommit.map((f) => `  - ${f}`).join("\n")}`;

  const confirmed = await previewAndConfirm("📋 Preview", preview, "Create this commit?");

  if (!confirmed) {
    console.log("\n❌ Cancelled.");
    await logActivity({
      command: "smart-commit",
      success: false,
      errorMessage: "User cancelled",
      durationMs: Date.now() - startTime,
      commitMessage,
      filesChanged: filesToCommit.length,
      userInput: { type, confirmed: false },
    });
    process.exit(0);
  }

  // Step 6: Stage files if needed and commit
  console.log("\n⚙️  Committing...");

  try {
    if (!hasStaged) {
      await stageFiles(filesToCommit);
      console.log("✓ Staged files");
    }

    await commit(commitMessage);
    console.log(`✓ Committed: ${commitMessage}`);

    console.log("\n✅ Done!");

    await logActivity({
      command: "smart-commit",
      success: true,
      durationMs: Date.now() - startTime,
      commitMessage,
      filesChanged: filesToCommit.length,
      userInput: { type, confirmed: true, aiGenerated: true },
    });
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "smart-commit",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      commitMessage,
      filesChanged: filesToCommit.length,
    });
    process.exit(1);
  }
}
