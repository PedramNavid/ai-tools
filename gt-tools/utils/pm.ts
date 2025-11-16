import { $ } from "bun";

const PM_CLI = "uv run /Users/pedram/code/project-management/pm.py";

export interface PMTask {
  id: number;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
}

export interface PMProject {
  id: number;
  name: string;
}

/**
 * Get the repository name (for PM project name)
 */
async function getRepoName(): Promise<string> {
  try {
    const path = process.cwd();
    const parts = path.split("/");
    return parts[parts.length - 1];
  } catch {
    return "default";
  }
}

/**
 * Check if a project exists in PM
 */
export async function projectExists(projectName: string): Promise<boolean> {
  try {
    const output = await $`${PM_CLI.split(" ")} project list`.text();
    return output.includes(projectName);
  } catch {
    return false;
  }
}

/**
 * Create a PM project
 */
export async function createProject(projectName: string): Promise<void> {
  await $`${PM_CLI.split(" ")} project create ${projectName}`.quiet();
}

/**
 * Ensure project exists, create if needed
 */
export async function ensureProject(projectName?: string): Promise<string> {
  const repoName = projectName || (await getRepoName());

  if (!(await projectExists(repoName))) {
    console.log(`Creating PM project: ${repoName}`);
    await createProject(repoName);
  }

  return repoName;
}

/**
 * Add a task to PM
 */
export async function addTask(
  title: string,
  description: string,
  projectName?: string
): Promise<void> {
  const project = await ensureProject(projectName);

  await $`${PM_CLI.split(" ")} add ${title} -p ${project} -d ${description}`.quiet();
}

/**
 * Add multiple tasks to PM
 */
export async function addTasks(
  tasks: Array<{ title: string; description: string }>,
  projectName?: string
): Promise<void> {
  const project = await ensureProject(projectName);

  for (const task of tasks) {
    await addTask(task.title, task.description, project);
  }
}

/**
 * List all tasks for a project
 */
export async function listTasks(projectName?: string): Promise<string> {
  const project = projectName || (await getRepoName());

  try {
    return await $`${PM_CLI.split(" ")} ls -p ${project}`.text();
  } catch {
    return "";
  }
}
