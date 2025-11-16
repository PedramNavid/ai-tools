# gt-tools

Git tools - Automate common git workflows with AI assistance.

A CLI tool that streamlines git workflows by leveraging Claude AI to generate branch names, commit messages, PR descriptions, and more.

## Features

- **Branch and Commit**: Create a feature branch and commit staged changes with AI-generated names/messages
- **Smart Commit**: Generate conventional commit messages automatically
- **PR Todos**: Extract action items from PR comments and create tasks in your PM system
- **Create PR**: Generate PR titles and descriptions from your commits
- **Code Review**: Get AI-powered code review comments
- **PR Security Review**: Analyze pull requests for security vulnerabilities
- **Clean Branches**: Find and delete merged/stale branches

## Installation

```bash
bun install
chmod +x index.ts
```

For global usage, create a symlink:

```bash
ln -s $(pwd)/index.ts /usr/local/bin/gt
```

Or use `bun link`:

```bash
bun link
```

## Prerequisites

- [Bun](https://bun.com) runtime
- [GitHub CLI](https://cli.github.com/) (`gh`) for PR-related commands
- Claude CLI or Claude Code (for AI-powered features)
- [PM CLI](https://github.com/pedram/project-management) (optional, for pr-todos command)

## Usage

### Interactive Mode

Run without arguments to see an interactive menu:

```bash
gt
```

### Direct Commands

Run specific commands directly:

```bash
# Create a branch and commit staged changes
gt branch-commit

# Create a smart commit
gt smart-commit
gt smart-commit feat "add user authentication"

# Extract PR todos
gt pr-todos
gt pr-todos 123

# Create a pull request
gt create-pr

# Generate code review
gt review

# Security review for a PR
gt pr-security
gt pr-security 123

# Clean up branches
gt clean-branches
```

## Commands

### `branch-commit`

Creates a new branch with `pdrm/` prefix and commits staged changes.

**Workflow:**
1. Checks for staged changes
2. Analyzes changes with Claude AI
3. Suggests branch name and commit message
4. Shows preview and asks for confirmation
5. Creates branch and commits

**Example:**
```bash
git add .
gt branch-commit
```

### `smart-commit`

Creates a conventional commit with AI-generated message.

**Workflow:**
1. Checks for staged or unstaged changes
2. Analyzes changes with Claude AI
3. Generates conventional commit message
4. Shows preview and asks for confirmation
5. Stages files (if needed) and commits

**Format:** `<type>(<scope>): <subject>`

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore

**Example:**
```bash
# Let AI generate the full message
gt smart-commit

# Provide type and message
gt smart-commit feat "add login page"
```

### `pr-todos`

Extracts action items from PR comments and creates tasks in your PM system.

**Workflow:**
1. Fetches PR comments and review comments via `gh` CLI
2. Analyzes comments for action items (requests, suggestions, issues)
3. Creates tasks in PM (using the PM CLI)

**Example:**
```bash
gt pr-todos 123
```

**Action keywords detected:**
- can you, could you, please
- consider, maybe, what about
- this should, need to, don't forget
- suggestion, todo, fix, nit

### `create-pr`

Creates a pull request with AI-generated title and description.

**Workflow:**
1. Checks current branch (must be on a feature branch)
2. Analyzes commits since diverged from base branch
3. Generates PR title and description with Claude AI
4. Shows preview and asks for confirmation
5. Pushes branch (if needed) and creates PR via `gh` CLI

**Example:**
```bash
gt create-pr
```

### `review`

Generates code review comments for your changes.

**Workflow:**
1. Lets you choose what to review (staged, unstaged, or full branch)
2. Analyzes changes with Claude AI
3. Generates constructive review comments
4. Displays actionable feedback

**Example:**
```bash
gt review
```

**Focuses on:**
- Potential bugs or issues
- Code quality and best practices
- Performance concerns
- Security issues
- Suggestions for improvement

### `pr-security`

Performs a comprehensive security review of a pull request.

**Workflow:**
1. Prompts for PR number (or accepts as argument)
2. Fetches PR information and changes via `gh` CLI
3. Analyzes changes with Claude AI for security vulnerabilities
4. Provides categorized findings (Critical, High, Medium, Low, Info)

**Example:**
```bash
gt pr-security 123
```

**Security checks include:**
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
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
- Command injection
- Insecure cryptography usage
- And more...

**Output severity levels:**
- Critical - Requires immediate attention before merge
- High - Should be addressed before merge
- Medium - Should be addressed soon
- Low - Minor issues to consider
- Info - Security-related observations and best practices

### `clean-branches`

Finds and deletes merged/stale branches.

**Workflow:**
1. Lists all local branches
2. Checks merge status against main/master
3. Shows merged and unmerged branches
4. Lets you select which to delete
5. Confirms and deletes selected branches

**Example:**
```bash
gt clean-branches
```

## Configuration

### Claude Integration

The tool uses Claude CLI/MCP for AI features. Ensure you have:

1. Claude Code CLI installed and configured, or
2. Claude CLI available in your PATH, or
3. Set `ANTHROPIC_API_KEY` environment variable

### PM Integration

For the `pr-todos` command, ensure the PM CLI is available at:

```
/Users/pedram/code/project-management/pm.py
```

Or update the path in `utils/pm.ts`.

### Activity Logging

All `gt` commands are automatically logged to a DuckDB database at `~/.gt/activity.db`. This helps track:

- Command usage patterns
- Success/failure rates
- Time spent on different workflows
- Repository activity across all your projects

The database captures:
- Command name and execution time
- Repository information (name, remote, branch)
- Success/failure status and error messages
- Command-specific data (PR numbers, commit messages, branch names, etc.)
- Outcomes (files changed, issues found, tasks created, etc.)
- User inputs and preferences

**Privacy**: Code diffs are never logged - only metadata and summaries.

You can query the database directly using DuckDB or any SQLite-compatible tool:

```bash
# Example: View recent activity
duckdb ~/.gt/activity.db "SELECT command, repo_name, success, timestamp FROM activity ORDER BY timestamp DESC LIMIT 10"

# Example: Most used commands
duckdb ~/.gt/activity.db "SELECT command, COUNT(*) as count FROM activity GROUP BY command ORDER BY count DESC"

# Example: Average duration by command
duckdb ~/.gt/activity.db "SELECT command, AVG(duration_ms) as avg_ms FROM activity WHERE duration_ms IS NOT NULL GROUP BY command"
```

## Project Structure

```
gt-tools/
├── index.ts              # Main CLI entry point
├── commands/             # Command implementations
│   ├── branch-commit.ts
│   ├── pr-todos.ts
│   ├── smart-commit.ts
│   ├── clean-branches.ts
│   ├── create-pr.ts
│   ├── review.ts
│   └── pr-security.ts
├── utils/                # Utility functions
│   ├── claude.ts         # Claude AI integration
│   ├── pm.ts             # PM CLI wrapper
│   ├── git.ts            # Git operations
│   └── prompts.ts        # Interactive prompts
└── package.json
```

## Development

Built with:
- [Bun](https://bun.com) - Fast JavaScript runtime
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) - Interactive CLI prompts

## License

Private project
