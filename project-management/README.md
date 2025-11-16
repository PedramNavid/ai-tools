# Project Management CLI

A simple, fast command-line tool for managing tasks and projects. 
Can be used with Claude Code as a replacement for the built-in Todo tool

```
❯ pm ls -p project-management -a                                         
                                     Tasks                                      
┏━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━┓
┃ ID     ┃ Title                 ┃ Project            ┃ Status       ┃ Created ┃
┡━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━┩
│ 138    │ Fix database          │ project-management │ done         │ 3m ago  │
│        │ connection context    │                    │              │         │
│        │ managers              │                    │              │         │
└────────┴───────────────────────┴────────────────────┴──────────────┴─────────┘
```

## Installation

### Option 1: Using uv (Recommended)

No installation needed! Just run with `uv`:

```bash
uv run pm.py --help
```

The script uses inline dependencies, so uv will automatically manage the virtual environment.

### Option 2: Traditional pip install

```bash
pip install -r requirements.txt
chmod +x pm.py
```

### Setup Alias

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# If using uv (recommended)
alias pm='uv run /Users/pedram/code/project-management/pm.py'

# If using pip
alias pm='python3 /Users/pedram/code/project-management/pm.py'
```

Then run: `source ~/.zshrc`

## Quick Start

```bash
uv run pm.py project create work
uv run pm.py add "Review pull requests" -p work -d "Check team PRs"

uv run pm.py ls
uv run pm.py task update 1 --status in-progress

# Can use i/t/d as a short-hand for in-progress, todo, done.
uv run pm.py task update 1 --status i

uv run pm.py done 1

uv run pm.py task show 1
```

## Commands

### Projects

- `pm.py project create <name>` - Create a new project
- `pm.py project list` - List all projects

### Tasks

- `pm.py task create <title>` - Create a new task
  - `--project, -p` - Assign to a project
  - `--description, -d` - Add a description
- `pm.py task list` - List all tasks
  - `--project, -p` - Filter by project
  - `--status, -s` - Filter by status (todo, in-progress, done)
- `pm.py task show <id>` - Show task details
- `pm.py task update <id>` - Update a task
  - `--status, -s` - Change status
  - `--title, -t` - Change title
  - `--description, -d` - Change description
  - `--project, -p` - Move to different project
- `pm.py task delete <id>` - Delete a task

### Quick Aliases

- `pm.py add <title>` - Shortcut for task create
- `pm.py ls` - Shortcut for task list
- `pm.py done <id>` - Quickly mark task as done

## Task Statuses

- `todo` - Not started yet
- `in-progress` - Currently working on
- `done` - Completed

## Data Storage

Tasks are stored in a SQLite database at `~/.pm/tasks.db`

## Examples

### Daily workflow

```bash
# Morning: See what you need to do
pm ls --status todo

# Start working on something
pm task update 3 --status in-progress

# Add a quick task
pm add "Fix bug in auth" -p backend

# End of day: Mark completed work
pm done 3
pm done 5

# See everything
pm ls
```

### Project-based workflow

```bash
# Set up projects
pm project create frontend
pm project create backend
pm project create devops

# Add tasks to projects
pm add "Implement dark mode" -p frontend
pm add "Add caching layer" -p backend
pm add "Set up monitoring" -p devops

# Focus on one project
pm ls --project backend
```

### Quick task tracking

```bash
# Add multiple tasks quickly
pm add "Code review for Alice"
pm add "Update documentation"
pm add "Team standup at 10am"

# Mark them done as you go
pm done 1
pm done 2
```
