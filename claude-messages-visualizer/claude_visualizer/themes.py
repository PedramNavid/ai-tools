"""Color themes for different environments."""

from typing import Dict
from enum import Enum


class Theme(Enum):
    """Available color themes."""
    AUTO = "auto"
    DARK = "dark"
    LIGHT = "light"
    JUPYTER = "jupyter"
    CUSTOM = "custom"


class ColorScheme:
    """Color scheme for visualization."""

    def __init__(
        self,
        title: str = "bold bright_blue",
        role: str = "italic bright_cyan",
        metadata_key: str = "bright_black",
        metadata_value: str = "white",
        content_label: str = "bold white",
        block_label: str = "bright_black",
        text_label: str = "bright_cyan",
        text_content: str = "white",
        tool_use_label: str = "bright_yellow",
        tool_name: str = "bold bright_yellow",
        tool_id: str = "bright_black",
        input_label: str = "bright_green",
        tool_result_label: str = "bright_yellow",
        success: str = "bright_green",
        error: str = "bright_red",
        output_label: str = "bright_cyan",
        unknown_type: str = "bright_magenta",
        panel_border: str = "bright_blue",
        usage_border: str = "bright_magenta",
        usage_header: str = "bold bright_magenta",
        usage_metric: str = "bright_cyan",
        usage_value: str = "bright_green",
        json_theme: str = "monokai",
    ):
        """Initialize color scheme with Rich color names."""
        self.title = title
        self.role = role
        self.metadata_key = metadata_key
        self.metadata_value = metadata_value
        self.content_label = content_label
        self.block_label = block_label
        self.text_label = text_label
        self.text_content = text_content
        self.tool_use_label = tool_use_label
        self.tool_name = tool_name
        self.tool_id = tool_id
        self.input_label = input_label
        self.tool_result_label = tool_result_label
        self.success = success
        self.error = error
        self.output_label = output_label
        self.unknown_type = unknown_type
        self.panel_border = panel_border
        self.usage_border = usage_border
        self.usage_header = usage_header
        self.usage_metric = usage_metric
        self.usage_value = usage_value
        self.json_theme = json_theme


# Predefined themes
DARK_THEME = ColorScheme(
    title="bold bright_blue",
    role="italic bright_cyan",
    metadata_key="bright_black",
    metadata_value="white",
    content_label="bold white",
    block_label="bright_black",
    text_label="bright_cyan",
    text_content="white",
    tool_use_label="bright_yellow",
    tool_name="bold bright_yellow",
    tool_id="bright_black",
    input_label="bright_green",
    tool_result_label="bright_yellow",
    success="bright_green",
    error="bright_red",
    output_label="bright_cyan",
    unknown_type="bright_magenta",
    panel_border="bright_blue",
    usage_border="bright_magenta",
    usage_header="bold bright_magenta",
    usage_metric="bright_cyan",
    usage_value="bright_green",
    json_theme="monokai",
)

LIGHT_THEME = ColorScheme(
    title="bold blue",
    role="italic cyan",
    metadata_key="black",
    metadata_value="black",
    content_label="bold black",
    block_label="black",
    text_label="cyan",
    text_content="black",
    tool_use_label="yellow",
    tool_name="bold yellow",
    tool_id="black",
    input_label="green",
    tool_result_label="yellow",
    success="green",
    error="red",
    output_label="cyan",
    unknown_type="magenta",
    panel_border="blue",
    usage_border="magenta",
    usage_header="bold magenta",
    usage_metric="cyan",
    usage_value="green",
    json_theme="default",
)

JUPYTER_THEME = ColorScheme(
    # Brighter colors for better visibility in Jupyter/VS Code
    title="bold cyan",
    role="italic green",
    metadata_key="dim white",
    metadata_value="white",
    content_label="bold white",
    block_label="dim white",
    text_label="cyan",
    text_content="white",
    tool_use_label="yellow",
    tool_name="bold yellow",
    tool_id="dim white",
    input_label="green",
    tool_result_label="yellow",
    success="green",
    error="red",
    output_label="cyan",
    unknown_type="magenta",
    panel_border="cyan",
    usage_border="magenta",
    usage_header="bold magenta",
    usage_metric="cyan",
    usage_value="green",
    json_theme="monokai",
)


def get_theme(theme: Theme = Theme.AUTO) -> ColorScheme:
    """
    Get a color scheme by theme name.

    Args:
        theme: Theme enum value

    Returns:
        ColorScheme instance
    """
    if theme == Theme.DARK:
        return DARK_THEME
    elif theme == Theme.LIGHT:
        return LIGHT_THEME
    elif theme == Theme.JUPYTER:
        return JUPYTER_THEME
    elif theme == Theme.AUTO:
        # Try to detect environment
        try:
            import IPython
            # We're in a Jupyter environment
            return JUPYTER_THEME
        except ImportError:
            # Default to dark theme for terminals
            return DARK_THEME
    else:
        return DARK_THEME


# Global theme setting
_current_theme = None


def set_theme(theme: Theme) -> None:
    """
    Set the global color theme.

    Args:
        theme: Theme enum value
    """
    global _current_theme
    _current_theme = get_theme(theme)


def get_current_theme() -> ColorScheme:
    """Get the current color scheme."""
    global _current_theme
    if _current_theme is None:
        _current_theme = get_theme(Theme.AUTO)
    return _current_theme
