"""Example usage in Jupyter notebooks with better colors."""

import os
from anthropic import Anthropic

# Initialize the client
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def example_jupyter_theme():
    """
    Use the Jupyter theme for better visibility in notebook environments.

    This theme uses brighter colors that work better in Jupyter/VS Code notebooks
    where the default terminal colors may appear too dark.
    """
    from claude_visualizer import visualize, set_theme, Theme

    # Set the Jupyter theme globally
    set_theme(Theme.JUPYTER)

    # Now all visualizations will use the Jupyter theme
    with visualize():
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": "What is 2+2?"}],
        )

    return response


def example_light_theme():
    """Use the light theme for light-colored terminal backgrounds."""
    from claude_visualizer import visualize, set_theme, Theme

    # Set the light theme
    set_theme(Theme.LIGHT)

    with visualize():
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hello!"}],
        )

    return response


def example_auto_detect():
    """
    Auto-detect the environment and use the appropriate theme.

    By default, the visualizer will:
    - Use JUPYTER theme if running in IPython/Jupyter
    - Use DARK theme if running in a regular terminal
    """
    from claude_visualizer import visualize, set_theme, Theme

    # Set to auto-detect (this is the default)
    set_theme(Theme.AUTO)

    with visualize():
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Count to 3."}],
        )

    return response


def example_custom_colors():
    """Create a custom color scheme."""
    from claude_visualizer import visualize, ColorScheme
    from claude_visualizer.themes import _current_theme

    # Create a custom color scheme
    custom_theme = ColorScheme(
        title="bold magenta",
        role="italic yellow",
        tool_use_label="bright_cyan",
        tool_name="bold bright_cyan",
        success="bright_green",
        error="bright_red",
        panel_border="magenta",
    )

    # Set it as the current theme
    import claude_visualizer.themes as themes
    themes._current_theme = custom_theme

    with visualize():
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Say hi!"}],
        )

    return response


if __name__ == "__main__":
    print("This file is meant to be used in Jupyter notebooks.")
    print("\nYou can also run individual functions:")
    print("  example_jupyter_theme()")
    print("  example_light_theme()")
    print("  example_auto_detect()")
    print("  example_custom_colors()")
