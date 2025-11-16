import checkbox from "@inquirer/checkbox";
import { getBranches, isBranchMerged, deleteBranch, getDefaultBranch } from "../utils/git";
import { askConfirmation } from "../utils/prompts";
import { logActivity } from "../utils/logger";

export async function cleanBranches() {
  const startTime = Date.now();
  console.log("\n🧹 Clean Branches - Find and Delete Merged/Stale Branches\n");

  // Step 1: Get default branch (main or master)
  const defaultBranch = await getDefaultBranch();
  console.log(`Using '${defaultBranch}' as base branch\n`);

  // Step 2: Get all local branches
  console.log("📥 Fetching local branches...");
  const branches = await getBranches();

  // Filter out current branch, default branch, and remote branches
  const localBranches = branches.filter(
    (b) => !b.current && !b.name.startsWith("remotes/") && b.name !== defaultBranch && b.name !== "master" && b.name !== "main"
  );

  if (localBranches.length === 0) {
    console.log("\n✓ No branches to clean. Your repository is tidy!");
    await logActivity({
      command: "clean-branches",
      success: true,
      durationMs: Date.now() - startTime,
      branchesDeleted: 0,
    });
    process.exit(0);
  }

  console.log(`✓ Found ${localBranches.length} local branch(es)\n`);

  // Step 3: Check which branches are merged
  console.log("🔍 Checking merge status...");

  const branchesWithStatus = await Promise.all(
    localBranches.map(async (branch) => ({
      ...branch,
      merged: await isBranchMerged(branch.name, defaultBranch),
    }))
  );

  const mergedBranches = branchesWithStatus.filter((b) => b.merged);
  const unmergedBranches = branchesWithStatus.filter((b) => !b.merged);

  console.log(`  ✓ ${mergedBranches.length} merged`);
  console.log(`  • ${unmergedBranches.length} unmerged\n`);

  if (mergedBranches.length === 0 && unmergedBranches.length === 0) {
    console.log("✓ No branches to clean.");
    await logActivity({
      command: "clean-branches",
      success: true,
      durationMs: Date.now() - startTime,
      branchesDeleted: 0,
    });
    process.exit(0);
  }

  // Step 4: Let user select branches to delete
  const choices = [
    ...mergedBranches.map((b) => ({
      name: `${b.name} (merged)`,
      value: b.name,
      checked: true,
    })),
    ...unmergedBranches.map((b) => ({
      name: `${b.name} (unmerged - caution!)`,
      value: b.name,
      checked: false,
    })),
  ];

  const branchesToDelete = await checkbox({
    message: "Select branches to delete:",
    choices,
  });

  if (branchesToDelete.length === 0) {
    console.log("\n✓ No branches selected. Nothing to delete.");
    await logActivity({
      command: "clean-branches",
      success: true,
      durationMs: Date.now() - startTime,
      branchesDeleted: 0,
      metadata: { totalBranches: localBranches.length, mergedBranches: mergedBranches.length },
    });
    process.exit(0);
  }

  // Step 5: Confirm deletion
  console.log(`\nYou are about to delete ${branchesToDelete.length} branch(es):`);
  branchesToDelete.forEach((b) => console.log(`  - ${b}`));

  const confirmed = await askConfirmation("\nAre you sure you want to delete these branches?", false);

  if (!confirmed) {
    console.log("\n❌ Cancelled. No branches were deleted.");
    await logActivity({
      command: "clean-branches",
      success: false,
      errorMessage: "User cancelled",
      durationMs: Date.now() - startTime,
      branchesDeleted: 0,
      metadata: {
        totalBranches: localBranches.length,
        mergedBranches: mergedBranches.length,
        selectedForDeletion: branchesToDelete.length,
      },
      userInput: { confirmed: false },
    });
    process.exit(0);
  }

  // Step 6: Delete branches
  console.log("\n🗑️  Deleting branches...");

  let successCount = 0;
  let errorCount = 0;

  for (const branchName of branchesToDelete) {
    try {
      const isUnmerged = unmergedBranches.some((b) => b.name === branchName);
      await deleteBranch(branchName, isUnmerged);
      console.log(`  ✓ Deleted: ${branchName}`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed to delete ${branchName}: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Done! Deleted ${successCount} branch(es).`);
  if (errorCount > 0) {
    console.log(`⚠️  Failed to delete ${errorCount} branch(es).`);
  }

  await logActivity({
    command: "clean-branches",
    success: successCount > 0,
    durationMs: Date.now() - startTime,
    branchesDeleted: successCount,
    metadata: {
      totalBranches: localBranches.length,
      mergedBranches: mergedBranches.length,
      failedDeletions: errorCount,
    },
  });
}
