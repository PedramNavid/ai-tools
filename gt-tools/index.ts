#!/usr/bin/env bun

import { Command } from "commander";
import select from "@inquirer/select";

// Import commands (we'll create these next)
import { branchCommit } from "./commands/branch-commit";
import { prTodos } from "./commands/pr-todos";
import { smartCommit } from "./commands/smart-commit";
import { cleanBranches } from "./commands/clean-branches";
import { createPR } from "./commands/create-pr";
import { review } from "./commands/review";
import { prSecurity } from "./commands/pr-security";

const program = new Command();

program
  .name("gt")
  .description("Git tools - Automate common git workflows with AI assistance")
  .version("1.0.0");

// Define subcommands
program
  .command("branch-commit")
  .description("Create a branch and commit staged changes")
  .action(async () => {
    await branchCommit();
  });

program
  .command("pr-todos")
  .description("Extract action items from PR comments and create PM tasks")
  .argument("[pr-number]", "Pull request number")
  .action(async (prNumber?: string) => {
    await prTodos(prNumber);
  });

program
  .command("smart-commit")
  .description("Create a conventional commit with AI-generated message")
  .argument("[type]", "Commit type (feat, fix, docs, etc.)")
  .argument("[message]", "Commit message")
  .action(async (type?: string, message?: string) => {
    await smartCommit(type, message);
  });

program
  .command("clean-branches")
  .description("Find and delete merged/stale branches")
  .action(async () => {
    await cleanBranches();
  });

program
  .command("create-pr")
  .description("Create a PR with AI-generated description")
  .action(async () => {
    await createPR();
  });

program
  .command("review")
  .description("Generate code review comments for current changes")
  .action(async () => {
    await review();
  });

program
  .command("pr-security")
  .description("Perform security review of a pull request")
  .argument("[pr-number]", "Pull request number")
  .action(async (prNumber?: string) => {
    await prSecurity(prNumber);
  });

// Interactive menu - runs when no command is provided
async function interactiveMenu() {
  console.log("\n🛠️  Git Tools - Select a workflow:\n");

  const choice = await select({
    message: "What would you like to do?",
    choices: [
      {
        name: "Branch and commit - Create a branch and commit staged changes",
        value: "branch-commit",
      },
      {
        name: "Smart commit - Create a conventional commit",
        value: "smart-commit",
      },
      {
        name: "PR todos - Extract action items from PR comments",
        value: "pr-todos",
      },
      {
        name: "Create PR - Create a PR with AI description",
        value: "create-pr",
      },
      {
        name: "Code review - Generate review comments",
        value: "review",
      },
      {
        name: "PR security review - Analyze PR for security issues",
        value: "pr-security",
      },
      {
        name: "Clean branches - Delete merged/stale branches",
        value: "clean-branches",
      },
    ],
  });

  // Execute the selected command
  switch (choice) {
    case "branch-commit":
      await branchCommit();
      break;
    case "pr-todos":
      await prTodos();
      break;
    case "smart-commit":
      await smartCommit();
      break;
    case "clean-branches":
      await cleanBranches();
      break;
    case "create-pr":
      await createPR();
      break;
    case "review":
      await review();
      break;
    case "pr-security":
      await prSecurity();
      break;
  }
}

// If no arguments provided, show interactive menu
if (process.argv.length === 2) {
  interactiveMenu().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
} else {
  // Parse command line arguments
  program.parse(process.argv);
}
