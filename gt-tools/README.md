# gt-tools

Git tools - Automate common git workflows with AI assistance.

A CLI tool that streamlines git workflows by leveraging Claude AI to generate branch names, commit messages, PR descriptions, and more.

## Features

- **Branch and Commit**: Create a feature branch and commit staged changes with AI-generated names/messages
- **Smart Commit**: Generate conventional commit messages automatically
- **PR Todos**: Extract action items from PR comments and create tasks using `pm`  
- **Create PR**: Generate PR titles and descriptions from your commits
- **Code Review**: Get AI-powered code review comments
- **PR Security Review**: Analyze pull requests for security vulnerabilities
- **Clean Branches**: Find and delete merged/stale branches (this one doesnt work that well, use with caution)

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
