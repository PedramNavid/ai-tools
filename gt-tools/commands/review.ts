import { getStatus, getStagedDiff, getUnstagedDiff, getDefaultBranch, getDiffSinceDiverge } from "../utils/git";
import { generateReview } from "../utils/claude";
import select from "@inquirer/select";
import { logActivity } from "../utils/logger";

export async function review() {
  const startTime = Date.now();
  console.log("\n🔍 Code Review Assistant\n");

  // Step 1: Determine what to review
  const status = await getStatus();

  const options = [];

  if (status.staged.length > 0) {
    options.push({
      name: `Staged changes (${status.staged.length} file(s))`,
      value: "staged",
    });
  }

  if (status.unstaged.length > 0) {
    options.push({
      name: `Unstaged changes (${status.unstaged.length} file(s))`,
      value: "unstaged",
    });
  }

  // Check if we're on a feature branch
  const defaultBranch = await getDefaultBranch();
  if (status.branch !== defaultBranch && status.branch !== "main" && status.branch !== "master") {
    options.push({
      name: `All changes in current branch (vs ${defaultBranch})`,
      value: "branch",
    });
  }

  if (options.length === 0) {
    console.log("✓ No changes to review.");
    await logActivity({
      command: "review",
      success: true,
      durationMs: Date.now() - startTime,
      issuesFound: 0,
    });
    process.exit(0);
  }

  let reviewType: string;

  if (options.length === 1) {
    reviewType = options[0].value;
    console.log(`Reviewing: ${options[0].name}\n`);
  } else {
    reviewType = await select({
      message: "What would you like to review?",
      choices: options,
    });
  }

  // Step 2: Get the appropriate diff
  console.log("\n📊 Analyzing changes...");

  let diff = "";
  switch (reviewType) {
    case "staged":
      diff = await getStagedDiff();
      break;
    case "unstaged":
      diff = await getUnstagedDiff();
      break;
    case "branch":
      diff = await getDiffSinceDiverge(defaultBranch);
      break;
  }

  if (!diff.trim()) {
    console.log("✓ No changes found to review.");
    await logActivity({
      command: "review",
      success: true,
      durationMs: Date.now() - startTime,
      issuesFound: 0,
      metadata: { reviewType },
    });
    process.exit(0);
  }

  // Step 3: Generate review comments
  console.log("🤖 Generating review comments...\n");

  let comments: string[];
  try {
    comments = await generateReview(diff);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "review",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      metadata: { reviewType },
    });
    process.exit(1);
  }

  // Step 4: Display review comments
  if (comments.length === 0) {
    console.log("✅ No issues found! The code looks good.");
  } else {
    console.log(`📝 Review Comments (${comments.length}):\n`);
    comments.forEach((comment, i) => {
      console.log(`${i + 1}. ${comment}\n`);
    });
  }

  await logActivity({
    command: "review",
    success: true,
    durationMs: Date.now() - startTime,
    issuesFound: comments.length,
    metadata: { reviewType },
  });
}
