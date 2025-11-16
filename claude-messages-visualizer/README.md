# Claude Messages Visualizer

Pretty terminal visualization for Claude API responses, especially useful for debugging tool calls and understanding conversation flow.

## Features

- Beautiful tree-based visualization of Claude API responses
- Syntax-highlighted JSON for tool inputs/outputs
- Syntax-highlighted code for server tool executions
- Token usage statistics
- Support for text, tool_use, tool_result, server_tool_use, and code_execution_tool_result content blocks
- Displays caller context (direct model calls vs code execution environment)
- Multiple integration methods: CLI, decorator, context manager, global hook
- Multiple color themes (auto, dark, light, jupyter) for different environments
- Auto-save responses to JSON files
- Works with both Anthropic SDK objects and raw JSON

## Installation

```bash
pip install -e .
```

Or with uv:

```bash
uv pip install -e .
```

## Quick Start

### CLI Usage

Visualize a response from a JSON file:

```bash
claude-visualizer response.json
```

Visualize from stdin:

```bash
cat response.json | claude-visualizer -
```

Or from clipboard (macOS):

```bash
pbpaste | claude-visualizer -
```

### Python Integration

#### 1. Context Manager (Recommended)

```python
from anthropic import Anthropic
from claude_visualizer import visualize

client = Anthropic()

with visualize():
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": "What is 2+2?"}]
    )
# Visualization appears automatically
```

#### 2. Decorator

```python
from claude_visualizer import visualize

@visualize()
def get_response():
    return client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Hello!"}]
    )

response = get_response()
```

#### 3. Manual Capture with Auto-Save

```python
from claude_visualizer import visualize

viz = visualize(save_to="./responses", auto_show=True)

response = client.messages.create(...)
viz.capture(response)  # Visualizes and saves to ./responses/
```

#### 4. Global Hook

```python
from claude_visualizer import install_hook

# Install once at the start of your script
install_hook(save_to="./responses")

# All subsequent API calls are automatically visualized
response = client.messages.create(...)
```

## Theming

The visualizer supports multiple color themes to work better in different environments.

### Available Themes

- `auto` - Auto-detects environment (Jupyter theme for notebooks, dark for terminals)
- `dark` - Bright colors for dark terminal backgrounds (default for terminals)
- `light` - Darker colors for light terminal backgrounds
- `jupyter` - Optimized colors for Jupyter/VS Code notebooks

### Using Themes

#### CLI

```bash
# Use Jupyter theme
claude-visualizer response.json --theme jupyter

# Use light theme
claude-visualizer response.json --theme light
```

#### Python

```python
from claude_visualizer import visualize, set_theme, Theme

# Set theme globally
set_theme(Theme.JUPYTER)

# Now all visualizations use this theme
with visualize():
    response = client.messages.create(...)
```

#### Custom Colors

```python
from claude_visualizer import ColorScheme
import claude_visualizer.themes as themes

# Create custom theme
custom = ColorScheme(
    title="bold magenta",
    tool_use_label="bright_cyan",
    success="bright_green",
    panel_border="magenta",
)

# Apply it
themes._current_theme = custom
```

## Use Cases

### VSCode Development

When developing in VSCode, use the context manager or decorator to automatically visualize responses in your terminal:

```python
with visualize(save_to="./debug"):
    response = client.messages.create(...)
```

### Jupyter Notebooks

In Jupyter notebooks, use the Jupyter theme for better color visibility:

```python
from claude_visualizer import visualize, set_theme, Theme

# Set Jupyter theme for better colors in notebooks
set_theme(Theme.JUPYTER)

viz = visualize(auto_show=True)

response = client.messages.create(...)
viz.capture(response)
```

Or use auto-detect (default behavior):

```python
from claude_visualizer import visualize

# Auto-detects Jupyter and uses appropriate colors
with visualize():
    response = client.messages.create(...)
```

### Debugging Tool Use

The visualizer is especially helpful for debugging multi-step tool use:

```python
from claude_visualizer import visualize

with visualize():
    # Initial tool use
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=[...],
        messages=[{"role": "user", "content": "What's the weather?"}]
    )

    # See the tool call clearly in the visualization
```

## Example Output

The visualizer shows:

- Message metadata (model, stop reason)
- Content blocks in a tree structure
- Text content with truncation for long outputs
- Tool calls with syntax-highlighted JSON inputs and caller context
- Tool results with clear success/error status
- Server tool use with syntax-highlighted code and line numbers
- Code execution results with separate stdout/stderr and exit codes
- Token usage statistics in a table

## Examples

See the `examples/` directory for more usage patterns:

- `basic_usage.py` - All integration methods
- `sample_response.json` - Example response for CLI testing
- `server_tool_use_sample.json` - Example with server tool execution (Python code)
- `code_execution_sample.json` - Example with code execution results (stdout)
- `code_execution_error_sample.json` - Example with error output (stderr)
- `tool_with_caller_sample.json` - Example showing caller context
- `jupyter_example.py` - Theme examples for Jupyter notebooks

Try the CLI with the samples:

```bash
# Tool use example
claude-visualizer examples/sample_response.json

# Server tool use with code execution
claude-visualizer examples/server_tool_use_sample.json

# Code execution results
claude-visualizer examples/code_execution_sample.json

# Tool calls with caller context (direct vs code execution)
claude-visualizer examples/tool_with_caller_sample.json

# Use Jupyter theme for better colors in notebooks
claude-visualizer examples/sample_response.json --theme jupyter
```

## Requirements

- Python 3.8+
- `rich` - Terminal formatting
- `anthropic` - Claude SDK (optional, for type support)

## License

MIT
