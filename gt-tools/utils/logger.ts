import * as duckdb from "duckdb";
import * as path from "path";
import * as fs from "fs";
import { $ } from "bun";

// Database location
const DB_DIR = path.join(process.env.HOME || "~", ".gt");
const DB_PATH = path.join(DB_DIR, "activity.db");

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database connection
let db: duckdb.Database | null = null;

function getDB(): duckdb.Database {
  if (!db) {
    db = new duckdb.Database(DB_PATH);
  }
  return db;
}

// Initialize database schema
export async function initDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(
      `
      CREATE SEQUENCE IF NOT EXISTS activity_id_seq START 1;
      CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY DEFAULT nextval('activity_id_seq'),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        command VARCHAR NOT NULL,
        repo_name VARCHAR,
        repo_remote VARCHAR,
        branch VARCHAR,
        working_directory VARCHAR NOT NULL,
        success BOOLEAN,
        error_message VARCHAR,
        duration_ms INTEGER,
        -- Command-specific data
        pr_number INTEGER,
        commit_message VARCHAR,
        branch_name VARCHAR,
        commit_hash VARCHAR,
        pr_url VARCHAR,
        pr_title VARCHAR,
        pr_author VARCHAR,
        -- Outcome summaries
        files_changed INTEGER,
        issues_found INTEGER,
        issue_severity VARCHAR, -- JSON array of severity counts
        tasks_created INTEGER,
        branches_deleted INTEGER,
        -- User inputs
        user_input VARCHAR, -- JSON object of user-provided inputs
        -- Metadata
        metadata VARCHAR -- JSON object for additional command-specific data
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON activity(timestamp);
      CREATE INDEX IF NOT EXISTS idx_command ON activity(command);
      CREATE INDEX IF NOT EXISTS idx_repo ON activity(repo_name);
      CREATE INDEX IF NOT EXISTS idx_success ON activity(success);
    `,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Get current repository information
async function getRepoInfo(): Promise<{
  repoName: string | null;
  repoRemote: string | null;
  branch: string | null;
  workingDir: string;
}> {
  let repoName: string | null = null;
  let repoRemote: string | null = null;
  let branch: string | null = null;

  try {
    // Get repo name from git
    const remote = await $`git config --get remote.origin.url`.text();
    repoRemote = remote.trim();

    // Extract repo name from URL
    const match = repoRemote.match(/\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      repoName = match[1];
    }
  } catch {
    // Not a git repo or no remote
  }

  try {
    branch = (await $`git branch --show-current`.text()).trim();
  } catch {
    // Not on a branch
  }

  const workingDir = process.cwd();

  return { repoName, repoRemote, branch, workingDir };
}

export interface ActivityLog {
  command: string;
  success?: boolean;
  errorMessage?: string;
  durationMs?: number;
  // Command-specific fields
  prNumber?: number;
  commitMessage?: string;
  branchName?: string;
  commitHash?: string;
  prUrl?: string;
  prTitle?: string;
  prAuthor?: string;
  // Outcome summaries
  filesChanged?: number;
  issuesFound?: number;
  issueSeverity?: { critical?: number; high?: number; medium?: number; low?: number; info?: number };
  tasksCreated?: number;
  branchesDeleted?: number;
  // User inputs
  userInput?: Record<string, any>;
  // Additional metadata
  metadata?: Record<string, any>;
}

// Log activity to database
export async function logActivity(activity: ActivityLog): Promise<void> {
  await initDB();

  const repoInfo = await getRepoInfo();

  return new Promise((resolve, reject) => {
    const database = getDB();

    const stmt = database.prepare(`
      INSERT INTO activity (
        command, repo_name, repo_remote, branch, working_directory,
        success, error_message, duration_ms,
        pr_number, commit_message, branch_name, commit_hash,
        pr_url, pr_title, pr_author,
        files_changed, issues_found, issue_severity,
        tasks_created, branches_deleted,
        user_input, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      activity.command,
      repoInfo.repoName,
      repoInfo.repoRemote,
      repoInfo.branch,
      repoInfo.workingDir,
      activity.success ?? null,
      activity.errorMessage ?? null,
      activity.durationMs ?? null,
      activity.prNumber ?? null,
      activity.commitMessage ?? null,
      activity.branchName ?? null,
      activity.commitHash ?? null,
      activity.prUrl ?? null,
      activity.prTitle ?? null,
      activity.prAuthor ?? null,
      activity.filesChanged ?? null,
      activity.issuesFound ?? null,
      activity.issueSeverity ? JSON.stringify(activity.issueSeverity) : null,
      activity.tasksCreated ?? null,
      activity.branchesDeleted ?? null,
      activity.userInput ? JSON.stringify(activity.userInput) : null,
      activity.metadata ? JSON.stringify(activity.metadata) : null,
      (err) => {
        stmt.finalize();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Helper to wrap command execution with logging
export async function withLogging<T>(
  command: string,
  fn: () => Promise<T>,
  extractLog?: (result: T) => Partial<ActivityLog>
): Promise<T> {
  const startTime = Date.now();
  let result: T;
  let success = false;
  let errorMessage: string | undefined;

  try {
    result = await fn();
    success = true;

    const durationMs = Date.now() - startTime;
    const additionalLog = extractLog ? extractLog(result) : {};

    await logActivity({
      command,
      success,
      durationMs,
      ...additionalLog,
    });

    return result;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);

    const durationMs = Date.now() - startTime;

    await logActivity({
      command,
      success,
      errorMessage,
      durationMs,
    });

    throw error;
  }
}

// Close database connection (call on exit)
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
