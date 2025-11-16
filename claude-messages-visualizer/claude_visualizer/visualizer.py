"""Rich terminal visualization for Claude API responses."""

import json
from typing import Any, Dict, Optional

from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.tree import Tree
from rich.text import Text
from rich.table import Table

from claude_visualizer.parser import ParsedMessage, ParsedContent
from claude_visualizer.themes import ColorScheme, get_current_theme


def format_json(data: Any, max_length: int = 500) -> str:
    """Format data as JSON string, truncating if too long."""
    json_str = json.dumps(data, indent=2)
    if len(json_str) > max_length:
        json_str = json_str[:max_length] + "\n  ... (truncated)"
    return json_str


def render_text_content(content: ParsedContent, tree: Tree, theme: ColorScheme) -> None:
    """Render a text content block."""
    text = content.data.get("text", "")
    if text:
        # Truncate very long text
        if len(text) > 1000:
            text = text[:1000] + "\n... (truncated)"
        text_node = tree.add(f"[{theme.text_label}]Text[/{theme.text_label}]")
        text_node.add(Text(text, style=theme.text_content))


def render_tool_use(content: ParsedContent, tree: Tree, theme: ColorScheme) -> None:
    """Render a tool_use content block."""
    tool_name = content.data.get("name", "unknown")
    tool_id = content.data.get("id", "")
    tool_input = content.data.get("input", {})
    caller = content.data.get("caller", {})

    tool_node = tree.add(f"[{theme.tool_use_label}]Tool Use:[/{theme.tool_use_label}] [{theme.tool_name}]{tool_name}[/{theme.tool_name}]")

    if tool_id:
        tool_node.add(f"[{theme.tool_id}]ID:[/{theme.tool_id}] {tool_id}")

    # Show caller type if available
    if caller:
        caller_type = caller.get("type", "unknown")
        # Add context for known caller types
        if caller_type == "code_execution_20250825":
            caller_label = "code execution environment"
        elif caller_type == "direct":
            caller_label = "model (direct)"
        else:
            caller_label = caller_type
        tool_node.add(f"[{theme.metadata_key}]Caller:[/{theme.metadata_key}] {caller_label}")

    if tool_input:
        input_node = tool_node.add(f"[{theme.input_label}]Input:[/{theme.input_label}]")
        json_syntax = Syntax(
            format_json(tool_input), "json", theme=theme.json_theme, line_numbers=False
        )
        input_node.add(json_syntax)


def render_server_tool_use(content: ParsedContent, tree: Tree, theme: ColorScheme) -> None:
    """Render a server_tool_use content block."""
    tool_id = content.data.get("id", "")
    tool_input = content.data.get("input", {})
    caller = content.data.get("caller", {})

    server_node = tree.add(f"[{theme.tool_use_label}]Server Tool Use[/{theme.tool_use_label}]")

    if tool_id:
        server_node.add(f"[{theme.tool_id}]ID:[/{theme.tool_id}] {tool_id}")

    # Show caller type if available
    if caller:
        caller_type = caller.get("type", "unknown")
        server_node.add(f"[{theme.metadata_key}]Caller:[/{theme.metadata_key}] {caller_type}")

    # Show code from input if available
    if tool_input:
        code = tool_input.get("code")
        if code:
            code_node = server_node.add(f"[{theme.input_label}]Code:[/{theme.input_label}]")
            # Truncate very long code
            if len(code) > 1000:
                code = code[:1000] + "\n... (truncated)"
            # Use python syntax highlighting for code
            code_syntax = Syntax(
                code, "python", theme=theme.json_theme, line_numbers=True
            )
            code_node.add(code_syntax)
        else:
            # Show full input if no code field
            input_node = server_node.add(f"[{theme.input_label}]Input:[/{theme.input_label}]")
            json_syntax = Syntax(
                format_json(tool_input), "json", theme=theme.json_theme, line_numbers=False
            )
            input_node.add(json_syntax)


def render_tool_result(content: ParsedContent, tree: Tree, theme: ColorScheme) -> None:
    """Render a tool_result content block."""
    tool_id = content.data.get("tool_use_id", "")
    is_error = content.data.get("is_error", False)
    result_content = content.data.get("content", "")

    status = f"[{theme.error}]Error[/{theme.error}]" if is_error else f"[{theme.success}]Success[/{theme.success}]"
    result_node = tree.add(f"[{theme.tool_result_label}]Tool Result:[/{theme.tool_result_label}] {status}")

    if tool_id:
        result_node.add(f"[{theme.tool_id}]Tool Use ID:[/{theme.tool_id}] {tool_id}")

    if result_content:
        # Handle both string and list content
        if isinstance(result_content, list):
            for item in result_content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item.get("text", "")
                    if text:
                        output_node = result_node.add(f"[{theme.output_label}]Output:[/{theme.output_label}]")
                        if len(text) > 1000:
                            text = text[:1000] + "\n... (truncated)"
                        output_node.add(Text(text, style=theme.text_content))
                else:
                    output_node = result_node.add(f"[{theme.output_label}]Output:[/{theme.output_label}]")
                    output_node.add(str(item))
        else:
            output_node = result_node.add(f"[{theme.output_label}]Output:[/{theme.output_label}]")
            text = str(result_content)
            if len(text) > 1000:
                text = text[:1000] + "\n... (truncated)"
            output_node.add(Text(text, style=theme.text_content))


def render_code_execution_result(content: ParsedContent, tree: Tree, theme: ColorScheme) -> None:
    """Render a code_execution_tool_result content block."""
    # Get the nested content structure
    nested_content = content.data.get("content", {})

    if isinstance(nested_content, dict):
        return_code = nested_content.get("return_code", 0)
        stdout = nested_content.get("stdout", "")
        stderr = nested_content.get("stderr", "")

        # Determine status based on return code
        status = f"[{theme.success}]Success (exit {return_code})[/{theme.success}]" if return_code == 0 else f"[{theme.error}]Error (exit {return_code})[/{theme.error}]"
        result_node = tree.add(f"[{theme.tool_result_label}]Code Execution Result:[/{theme.tool_result_label}] {status}")

        # Show stdout if present
        if stdout:
            stdout_node = result_node.add(f"[{theme.success}]stdout:[/{theme.success}]")
            # Truncate very long output
            if len(stdout) > 2000:
                stdout = stdout[:2000] + "\n... (truncated)"
            stdout_node.add(Text(stdout, style=theme.text_content))

        # Show stderr if present
        if stderr:
            stderr_node = result_node.add(f"[{theme.error}]stderr:[/{theme.error}]")
            # Truncate very long output
            if len(stderr) > 2000:
                stderr = stderr[:2000] + "\n... (truncated)"
            stderr_node.add(Text(stderr, style=theme.text_content))

        # If no output, mention it
        if not stdout and not stderr:
            result_node.add(f"[{theme.metadata_key}](no output)[/{theme.metadata_key}]")
    else:
        # Fallback to generic rendering
        result_node = tree.add(f"[{theme.tool_result_label}]Code Execution Result[/{theme.tool_result_label}]")
        json_syntax = Syntax(
            format_json(content.data), "json", theme=theme.json_theme, line_numbers=False
        )
        result_node.add(json_syntax)


def render_content_block(content: ParsedContent, tree: Tree, theme: ColorScheme) -> None:
    """Render a single content block based on its type."""
    if content.type == "text":
        render_text_content(content, tree, theme)
    elif content.type == "tool_use":
        render_tool_use(content, tree, theme)
    elif content.type == "tool_result":
        render_tool_result(content, tree, theme)
    elif content.type == "server_tool_use":
        render_server_tool_use(content, tree, theme)
    elif content.type == "code_execution_tool_result":
        render_code_execution_result(content, tree, theme)
    else:
        # Unknown content type
        unknown_node = tree.add(f"[{theme.unknown_type}]Unknown Type:[/{theme.unknown_type}] {content.type}")
        json_syntax = Syntax(
            format_json(content.data), "json", theme=theme.json_theme, line_numbers=False
        )
        unknown_node.add(json_syntax)


def create_usage_table(usage: Dict[str, int], theme: ColorScheme) -> Table:
    """Create a table showing token usage."""
    table = Table(show_header=True, header_style=theme.usage_header, box=None)
    table.add_column("Metric", style=theme.usage_metric)
    table.add_column("Value", justify="right", style=theme.usage_value)

    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    total_tokens = input_tokens + output_tokens

    table.add_row("Input Tokens", str(input_tokens))
    table.add_row("Output Tokens", str(output_tokens))
    table.add_row("Total Tokens", str(total_tokens))

    return table


def visualize_message(message: ParsedMessage, console: Console = None, theme: Optional[ColorScheme] = None) -> None:
    """
    Visualize a Claude API message in the terminal.

    Args:
        message: Parsed message to visualize
        console: Rich console instance (creates new one if not provided)
        theme: Color scheme to use (uses current theme if not provided)
    """
    if console is None:
        console = Console()

    if theme is None:
        theme = get_current_theme()

    # Create main tree
    tree = Tree(f"[{theme.title}]Claude Message[/{theme.title}] ([{theme.role}]{message.role}[/{theme.role}])")

    # Add metadata
    if message.model:
        tree.add(f"[{theme.metadata_key}]Model:[/{theme.metadata_key}] {message.model}")

    if message.stop_reason:
        tree.add(f"[{theme.metadata_key}]Stop Reason:[/{theme.metadata_key}] {message.stop_reason}")

    # Add content blocks
    if message.content:
        content_tree = tree.add(f"[{theme.content_label}]Content[/{theme.content_label}] ({len(message.content)} blocks)")
        for i, content in enumerate(message.content, 1):
            block_tree = content_tree.add(f"[{theme.block_label}]Block {i}[/{theme.block_label}]")
            render_content_block(content, block_tree, theme)

    # Create panel with the tree
    panel = Panel(
        tree,
        title="[bold]Claude API Response[/bold]",
        border_style=theme.panel_border,
        expand=False,
    )

    console.print(panel)

    # Show usage stats if available
    if message.usage:
        console.print()
        usage_table = create_usage_table(message.usage, theme)
        usage_panel = Panel(
            usage_table,
            title="[bold]Token Usage[/bold]",
            border_style=theme.usage_border,
            expand=False,
        )
        console.print(usage_panel)


def visualize(response: Any) -> None:
    """
    Main entry point for visualization.

    Args:
        response: Claude API response (Message object, dict, or ParsedMessage)
    """
    from claude_visualizer.parser import parse_response

    if isinstance(response, ParsedMessage):
        message = response
    else:
        message = parse_response(response)

    visualize_message(message)
