import { $ } from "bun";

export interface ClaudeResponse {
  text: string;
}

/**
 * Ask Claude to analyze git changes and suggest a branch name and commit message
 */
export async function suggestBranchAndCommit(diff: string, recentCommits: string): Promise<{
  branchName: string;
  commitMessage: string;
}> {
  const prompt = `Analyze these git changes and suggest:
1. A branch name (kebab-case, short, descriptive, 2-4 words)
2. A commit message (conventional commit format: type(scope): subject)

Recent commits for style reference:
${recentCommits}

Staged changes:
${diff}

Respond ONLY in this exact format (no other text):
BRANCH: <branch-name>
COMMIT: <commit-message>`;

  const response = await askClaude(prompt);

  // Parse response
  const branchMatch = response.match(/BRANCH:\s*(.+)/);
  const commitMatch = response.match(/COMMIT:\s*(.+)/);

  if (!branchMatch || !commitMatch) {
    throw new Error("Failed to parse Claude response");
  }

  return {
    branchName: branchMatch[1].trim(),
    commitMessage: commitMatch[1].trim(),
  };
}

/**
 * Ask Claude to generate a conventional commit message
 */
export async function suggestCommitMessage(
  diff: string,
  recentCommits: string,
  type?: string
): Promise<string> {
  const typeHint = type ? `The commit type should be: ${type}` : "";

  const prompt = `Analyze these git changes and generate a conventional commit message.

Format: <type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore

Recent commits for style reference:
${recentCommits}

${typeHint}

Changes:
${diff}

Respond with ONLY the commit message, nothing else.`;

  return await askClaude(prompt);
}

/**
 * Ask Claude to generate a PR title and description
 */
export async function suggestPRDescription(
  commits: string,
  diff: string
): Promise<{ title: string; description: string }> {
  const prompt = `Analyze these changes and create a Pull Request description.

Commits:
${commits}

Full changes:
${diff}

Generate:
1. A clear, concise PR title
2. A PR description with:
   - Summary (1-3 bullet points)
   - Test plan (checklist of testing steps)

Respond in this exact format:
TITLE: <pr-title>
DESCRIPTION:
<pr-description>`;

  const response = await askClaude(prompt);

  // Parse response
  const titleMatch = response.match(/TITLE:\s*(.+)/);
  const descMatch = response.match(/DESCRIPTION:\s*\n([\s\S]+)/);

  if (!titleMatch || !descMatch) {
    throw new Error("Failed to parse Claude response");
  }

  return {
    title: titleMatch[1].trim(),
    description: descMatch[1].trim(),
  };
}

/**
 * Ask Claude to generate code review comments
 */
export async function generateReview(diff: string): Promise<string[]> {
  const prompt = `Review these code changes and provide constructive feedback.

Focus on:
- Potential bugs or issues
- Code quality and best practices
- Performance concerns
- Security issues
- Suggestions for improvement

Changes:
${diff}

Provide a list of review comments. Each comment should be specific and actionable.
Format each comment on a new line starting with "- ".`;

  const response = await askClaude(prompt);

  // Parse comments (each line starting with "- ")
  return response
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.trim().substring(2));
}

/**
 * Ask Claude to perform a security-focused review of PR changes
 */
export async function generateSecurityReview(diff: string): Promise<{
  summary: string;
  critical: string[];
  high: string[];
  medium: string[];
  low: string[];
  info: string[];
}> {
  const prompt = `Perform a comprehensive security review of these code changes.

Analyze for:
- SQL injection vulnerabilities
- Cross-site scripting (XSS) vulnerabilities
- Authentication and authorization issues
- Insecure data storage or transmission
- Hardcoded secrets or credentials
- Input validation issues
- Security misconfiguration
- Insecure dependencies
- Information disclosure
- Missing security controls
- Rate limiting issues
- CSRF vulnerabilities
- Path traversal vulnerabilities
- Unsafe deserialization
- XML external entity (XXE) issues
- Server-side request forgery (SSRF)
- Command injection
- Insecure cryptography usage

Changes:
${diff}

Respond in this exact format:
SUMMARY: <one-line summary of overall security posture>

CRITICAL:
- <issue>
- <issue>

HIGH:
- <issue>
- <issue>

MEDIUM:
- <issue>
- <issue>

LOW:
- <issue>
- <issue>

INFO:
- <observation>
- <observation>

If no issues found in a category, write "None" instead of listing issues.`;

  const response = await askClaude(prompt);

  // Parse response
  const summaryMatch = response.match(/SUMMARY:\s*(.+)/);
  const criticalMatch = response.match(/CRITICAL:\s*\n([\s\S]*?)(?=\n\n|HIGH:|$)/);
  const highMatch = response.match(/HIGH:\s*\n([\s\S]*?)(?=\n\n|MEDIUM:|$)/);
  const mediumMatch = response.match(/MEDIUM:\s*\n([\s\S]*?)(?=\n\n|LOW:|$)/);
  const lowMatch = response.match(/LOW:\s*\n([\s\S]*?)(?=\n\n|INFO:|$)/);
  const infoMatch = response.match(/INFO:\s*\n([\s\S]*?)$/);

  const parseIssues = (text: string | undefined): string[] => {
    if (!text) return [];
    const issues = text
      .split("\n")
      .filter((line) => line.trim().startsWith("- "))
      .map((line) => line.trim().substring(2));
    return issues.filter((issue) => issue.toLowerCase() !== "none");
  };

  return {
    summary: summaryMatch?.[1]?.trim() || "No summary available",
    critical: parseIssues(criticalMatch?.[1]),
    high: parseIssues(highMatch?.[1]),
    medium: parseIssues(mediumMatch?.[1]),
    low: parseIssues(lowMatch?.[1]),
    info: parseIssues(infoMatch?.[1]),
  };
}

/**
 * Send a prompt to Claude via the Claude CLI
 * This assumes the user has Claude CLI or Claude Code CLI available
 */
async function askClaude(prompt: string): Promise<string> {
  try {
    // Try using claude CLI if available
    // This is a simplified version - in practice, you might need to adjust based on
    // how the user has Claude CLI set up
    const response = await $`echo ${prompt} | claude`.text();
    return response.trim();
  } catch (error) {
    // If Claude CLI is not available, provide instructions
    throw new Error(
      "Claude CLI not found. Please ensure you have Claude CLI installed and configured.\n" +
        "Alternatively, you can use the Anthropic API by setting ANTHROPIC_API_KEY."
    );
  }
}
