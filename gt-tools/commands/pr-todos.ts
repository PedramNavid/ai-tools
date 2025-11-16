import { $ } from "bun";
import input from "@inquirer/input";
import { getRepoInfo } from "../utils/git";
import { addTasks } from "../utils/pm";
import { logActivity } from "../utils/logger";

interface ActionItem {
  title: string;
  description: string;
  author: string;
}

export async function prTodos(prNumber?: string) {
  const startTime = Date.now();
  console.log("\n📝 PR Todos - Extract Action Items\n");

  // Step 1: Get PR number
  let prNum = prNumber;
  if (!prNum) {
    prNum = await input({
      message: "Enter PR number:",
      validate: (value) => {
        if (!value || !/^\d+$/.test(value)) {
          return "Please enter a valid PR number";
        }
        return true;
      },
    });
  }

  console.log(`\n📥 Fetching comments from PR #${prNum}...`);

  // Step 2: Get repo info
  const repoInfo = await getRepoInfo();
  if (!repoInfo) {
    console.error("❌ Could not determine repository info. Are you in a git repository with gh CLI configured?");
    await logActivity({
      command: "pr-todos",
      success: false,
      errorMessage: "Could not determine repository info",
      durationMs: Date.now() - startTime,
      prNumber: prNum ? parseInt(prNum) : undefined,
    });
    process.exit(1);
  }

  // Step 3: Fetch PR comments
  let comments: string[] = [];

  try {
    // Fetch both regular and review comments in parallel
    const [prComments, reviewComments] = await Promise.all([
      $`gh pr view ${prNum} --json comments --jq '.comments[] | "\(.author.login) (\(.createdAt)):\n\(.body)\n---"'`.text(),
      $`gh api repos/${repoInfo.owner}/${repoInfo.repo}/pulls/${prNum}/comments --jq '.[] | "\(.user.login) (\(.created_at)) [Line \(.line // .original_line)]:\n\(.body)\n---"'`.text(),
    ]);

    // Process regular PR comments
    if (prComments.trim()) {
      comments.push(...prComments.trim().split("---\n").filter(c => c.trim()));
    }

    // Process review comments (inline comments)
    if (reviewComments.trim()) {
      comments.push(...reviewComments.trim().split("---\n").filter(c => c.trim()));
    }
  } catch (error) {
    console.error(`❌ Error fetching PR comments: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "pr-todos",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      prNumber: parseInt(prNum),
    });
    process.exit(1);
  }

  if (comments.length === 0) {
    console.log("ℹ️  No comments found on this PR.");
    await logActivity({
      command: "pr-todos",
      success: true,
      durationMs: Date.now() - startTime,
      prNumber: parseInt(prNum),
      tasksCreated: 0,
    });
    process.exit(0);
  }

  console.log(`✓ Found ${comments.length} comment(s)\n`);

  // Step 4: Analyze comments for action items
  console.log("🔍 Analyzing comments for action items...");

  const actionItems = analyzeComments(comments);

  if (actionItems.length === 0) {
    console.log("\n✓ No action items found in PR comments.");
    await logActivity({
      command: "pr-todos",
      success: true,
      durationMs: Date.now() - startTime,
      prNumber: parseInt(prNum),
      tasksCreated: 0,
      metadata: { totalComments: comments.length },
    });
    process.exit(0);
  }

  console.log(`\n✓ Found ${actionItems.length} action item(s):\n`);

  // Display action items
  actionItems.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   From: ${item.author}`);
    console.log(`   ${item.description}\n`);
  });

  // Step 5: Create PM tasks
  console.log("📋 Creating PM tasks...");

  try {
    const tasks = actionItems.map((item) => ({
      title: item.title,
      description: `From: ${item.author}\nPR #${prNum}\n\n${item.description}`,
    }));

    await addTasks(tasks);
    console.log(`\n✅ Created ${tasks.length} task(s) in PM.`);

    await logActivity({
      command: "pr-todos",
      success: true,
      durationMs: Date.now() - startTime,
      prNumber: parseInt(prNum),
      tasksCreated: tasks.length,
      metadata: {
        totalComments: comments.length,
        actionItemAuthors: [...new Set(actionItems.map(i => i.author))],
      },
    });
  } catch (error) {
    console.error(`❌ Error creating PM tasks: ${error instanceof Error ? error.message : String(error)}`);
    await logActivity({
      command: "pr-todos",
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      prNumber: parseInt(prNum),
      metadata: { actionItemsFound: actionItems.length },
    });
    process.exit(1);
  }
}

/**
 * Analyze comments and extract action items
 */
function analyzeComments(comments: string[]): ActionItem[] {
  const actionItems: ActionItem[] = [];
  const actionKeywords = [
    "can you",
    "could you",
    "please",
    "consider",
    "maybe",
    "what about",
    "this should",
    "need to",
    "don't forget",
    "should we",
    "would be good",
    "suggestion:",
    "todo:",
    "fix:",
    "nit:",
  ];

  for (const comment of comments) {
    const lines = comment.split("\n");
    if (lines.length === 0) continue;

    // Extract author from first line (format: "username (date):" or "username (date) [Line X]:")
    const authorMatch = lines[0].match(/^(.+?)\s*\(/);
    const author = authorMatch ? authorMatch[1].trim() : "Unknown";

    // Get comment body (skip first line with author/date)
    const body = lines.slice(1).join("\n").trim();

    if (!body) continue;

    // Check if comment contains action keywords
    const lowerBody = body.toLowerCase();
    const hasActionKeyword = actionKeywords.some((keyword) => lowerBody.includes(keyword));

    // Skip if it's just an approval or acknowledgment
    const isApproval = /^(lgtm|looks good|approved|👍|✓)/i.test(body);
    const isAcknowledgment = /^(thanks|thank you|got it|ok|okay|done|fixed)/i.test(body);

    if (hasActionKeyword && !isApproval && !isAcknowledgment) {
      // Extract first sentence or line as title (handle multiple sentence-ending punctuation)
      const titleMatch = body.match(/^(.+?)(?:[.!?:]|$)/);
      const title = titleMatch ? titleMatch[1].trim() : body.substring(0, 80);

      actionItems.push({
        title: title.length > 80 ? title.substring(0, 77) + "..." : title,
        description: body,
        author,
      });
    }
  }

  return actionItems;
}
