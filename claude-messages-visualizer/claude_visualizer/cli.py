"""Command-line interface for Claude message visualization."""

import sys
import argparse
from pathlib import Path

from rich.console import Console

from claude_visualizer.parser import load_from_json, load_from_json_string, parse_response
from claude_visualizer.visualizer import visualize_message
from claude_visualizer.themes import Theme, set_theme


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Visualize Claude API responses in the terminal",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Visualize from a JSON file
  claude-visualizer response.json

  # Visualize from stdin
  cat response.json | claude-visualizer -

  # Pipe from clipboard (macOS)
  pbpaste | claude-visualizer -
        """,
    )

    parser.add_argument(
        "input",
        nargs="?",
        default=None,
        help="Path to JSON file, or '-' for stdin (default: stdin)",
    )

    parser.add_argument(
        "--json",
        action="store_true",
        help="Expect input as JSON string (for programmatic use)",
    )

    parser.add_argument(
        "--theme",
        choices=["auto", "dark", "light", "jupyter"],
        default="auto",
        help="Color theme to use (default: auto - detects environment)",
    )

    args = parser.parse_args()

    # Set the theme
    theme_map = {
        "auto": Theme.AUTO,
        "dark": Theme.DARK,
        "light": Theme.LIGHT,
        "jupyter": Theme.JUPYTER,
    }
    set_theme(theme_map[args.theme])

    console = Console()

    try:
        # Determine input source
        if args.input is None or args.input == "-":
            # Read from stdin
            if sys.stdin.isatty():
                console.print(
                    "[yellow]No input file specified. Reading from stdin...[/yellow]"
                )
                console.print("[dim]Paste JSON and press Ctrl+D (Unix) or Ctrl+Z (Windows) when done.[/dim]\n")

            json_input = sys.stdin.read()

            if not json_input.strip():
                console.print("[red]Error:[/red] No input provided", style="bold")
                sys.exit(1)

            message = load_from_json_string(json_input)

        else:
            # Read from file
            input_path = Path(args.input)

            if not input_path.exists():
                console.print(
                    f"[red]Error:[/red] File not found: {input_path}", style="bold"
                )
                sys.exit(1)

            message = load_from_json(str(input_path))

        # Visualize the message
        visualize_message(message, console)

    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user[/yellow]")
        sys.exit(130)

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}", style="bold")
        import traceback

        console.print(f"[dim]{traceback.format_exc()}[/dim]")
        sys.exit(1)


if __name__ == "__main__":
    main()
