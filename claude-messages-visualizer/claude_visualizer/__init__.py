"""Claude Messages Visualizer - Pretty terminal visualization for Claude API responses."""

from claude_visualizer.hooks import visualize, install_hook
from claude_visualizer.themes import Theme, set_theme, get_current_theme, ColorScheme

__version__ = "0.1.0"
__all__ = ["visualize", "install_hook", "Theme", "set_theme", "get_current_theme", "ColorScheme"]
