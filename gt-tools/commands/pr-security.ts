import { getPRDiff, getPRInfo } from "../utils/git";
import { generateSecurityReview } from "../utils/claude";
import input from "@inquirer/input";
import { logActivity } from "../utils/logger";

export async function prSecurity(prNumber?: string) {
  const startTime = Date.now();
  console.log("\n🔒 PR Security Review\n");

  // Step 1: Get PR number
  let pr = prNumber;
  if (!pr) {
    pr = await input({
      message: "Enter PR number:",
      validate: (value) => {
        if (!value || !/^\d+$/.test(value)) {
          return "Please enter a valid PR number";
        }
        return true;
      },
    });
  }

  // Step 2: Fetch PR information
  console.log(`\n📋 Fetching PR #${pr} information...\n`);

  let prInfo;
  try {
    prInfo = await getPRInfo(pr);
    console.log(`Title: ${prInfo.title}`);
    console.log(`Author: ${prInfo.author}`);
    console.log(`URL: ${prInfo.url}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\nMake sure you have GitHub CLI (gh) installed and are in a git repository.");
    await logActivity({
      command: "pr-security",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      prNumber: pr ? parseInt(pr) : undefined,
    });
    process.exit(1);
  }

  // Step 3: Fetch PR diff
  console.log("📊 Fetching PR changes...\n");

  let diff;
  try {
    diff = await getPRDiff(pr);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "pr-security",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      prNumber: parseInt(pr),
      prUrl: prInfo.url,
      prTitle: prInfo.title,
      prAuthor: prInfo.author,
    });
    process.exit(1);
  }

  if (!diff.trim()) {
    console.log("✓ No changes found in this PR.");
    await logActivity({
      command: "pr-security",
      success: true,
      durationMs: Date.now() - startTime,
      prNumber: parseInt(pr),
      prUrl: prInfo.url,
      prTitle: prInfo.title,
      prAuthor: prInfo.author,
      issuesFound: 0,
    });
    process.exit(0);
  }

  // Step 4: Perform security analysis
  console.log("🔍 Analyzing changes for security vulnerabilities...\n");
  console.log("This may take a moment...\n");

  let review;
  try {
    review = await generateSecurityReview(diff);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "pr-security",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      prNumber: parseInt(pr),
      prUrl: prInfo.url,
      prTitle: prInfo.title,
      prAuthor: prInfo.author,
    });
    process.exit(1);
  }

  // Step 5: Display results
  console.log("═══════════════════════════════════════════════════════\n");
  console.log(`📊 Security Review Summary\n`);
  console.log(`${review.summary}\n`);
  console.log("═══════════════════════════════════════════════════════\n");

  const hasIssues =
    review.critical.length > 0 ||
    review.high.length > 0 ||
    review.medium.length > 0 ||
    review.low.length > 0;

  if (!hasIssues && review.info.length === 0) {
    console.log("✅ No security issues found! The changes look secure.\n");
    await logActivity({
      command: "pr-security",
      success: true,
      durationMs: Date.now() - startTime,
      prNumber: parseInt(pr),
      prUrl: prInfo.url,
      prTitle: prInfo.title,
      prAuthor: prInfo.author,
      issuesFound: 0,
      issueSeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: { summary: review.summary },
    });
    process.exit(0);
  }

  // Display Critical Issues
  if (review.critical.length > 0) {
    console.log(`🚨 CRITICAL (${review.critical.length}):\n`);
    review.critical.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}\n`);
    });
  }

  // Display High Issues
  if (review.high.length > 0) {
    console.log(`⚠️  HIGH (${review.high.length}):\n`);
    review.high.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}\n`);
    });
  }

  // Display Medium Issues
  if (review.medium.length > 0) {
    console.log(`⚡ MEDIUM (${review.medium.length}):\n`);
    review.medium.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}\n`);
    });
  }

  // Display Low Issues
  if (review.low.length > 0) {
    console.log(`ℹ️  LOW (${review.low.length}):\n`);
    review.low.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}\n`);
    });
  }

  // Display Informational Notes
  if (review.info.length > 0) {
    console.log(`📝 INFORMATIONAL (${review.info.length}):\n`);
    review.info.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item}\n`);
    });
  }

  console.log("═══════════════════════════════════════════════════════\n");

  // Summary count
  const totalIssues =
    review.critical.length +
    review.high.length +
    review.medium.length +
    review.low.length;

  if (totalIssues > 0) {
    console.log(
      `⚠️  Found ${totalIssues} security issue(s). Please review before merging.\n`
    );
  } else if (review.info.length > 0) {
    console.log("✅ No security issues found. See informational notes above.\n");
  }

  // Log activity
  await logActivity({
    command: "pr-security",
    success: true,
    durationMs: Date.now() - startTime,
    prNumber: parseInt(pr),
    prUrl: prInfo.url,
    prTitle: prInfo.title,
    prAuthor: prInfo.author,
    issuesFound: totalIssues,
    issueSeverity: {
      critical: review.critical.length,
      high: review.high.length,
      medium: review.medium.length,
      low: review.low.length,
      info: review.info.length,
    },
    metadata: { summary: review.summary },
  });
}
