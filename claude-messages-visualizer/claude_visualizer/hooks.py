"""Integration hooks for easy use in Python code."""

import functools
import json
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Optional
from datetime import datetime

from claude_visualizer.visualizer import visualize as visualize_response


# Global flag for auto-visualization
_auto_visualize = False


class visualize:
    """
    Context manager and decorator for auto-visualization of Claude API responses.

    Usage as context manager:
        with visualize():
            response = client.messages.create(...)
        # Visualization appears automatically

    Usage as decorator:
        @visualize()
        def my_function():
            response = client.messages.create(...)
            return response
        # Visualization appears when function returns

    Usage with auto-save:
        with visualize(save_to="./responses"):
            response = client.messages.create(...)
        # Saves to ./responses/<timestamp>.json and visualizes
    """

    def __init__(self, save_to: Optional[str] = None, auto_show: bool = True):
        """
        Initialize the visualizer hook.

        Args:
            save_to: Optional directory to save responses as JSON files
            auto_show: Whether to automatically show visualization (default: True)
        """
        self.save_to = Path(save_to) if save_to else None
        self.auto_show = auto_show
        self.responses = []

        if self.save_to:
            self.save_to.mkdir(parents=True, exist_ok=True)

    def __enter__(self):
        """Enter context manager."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager - visualize collected responses."""
        if self.responses and self.auto_show:
            for response in self.responses:
                visualize_response(response)
        return False

    def __call__(self, func: Callable) -> Callable:
        """Use as decorator."""

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            # Check if result looks like a Claude response
            if self._is_claude_response(result):
                self.capture(result)

            return result

        return wrapper

    def capture(self, response: Any) -> None:
        """
        Manually capture a response for visualization.

        Args:
            response: Claude API response to capture
        """
        self.responses.append(response)

        # Save to file if configured
        if self.save_to:
            self._save_response(response)

        # Show immediately if auto_show is enabled
        if self.auto_show:
            visualize_response(response)

    def _save_response(self, response: Any) -> None:
        """Save response to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = self.save_to / f"response_{timestamp}.json"

        # Convert to dict if it's an SDK object
        if hasattr(response, "model_dump"):
            data = response.model_dump()
        elif hasattr(response, "dict"):
            data = response.dict()
        elif isinstance(response, dict):
            data = response
        else:
            # Can't serialize, skip
            return

        with open(filename, "w") as f:
            json.dump(data, f, indent=2)

    @staticmethod
    def _is_claude_response(obj: Any) -> bool:
        """Check if object looks like a Claude API response."""
        # Check for Anthropic SDK Message object
        if hasattr(obj, "content") and hasattr(obj, "role"):
            return True

        # Check for dict format
        if isinstance(obj, dict) and "content" in obj and "role" in obj:
            return True

        return False


def install_hook(save_to: Optional[str] = None) -> None:
    """
    Install a global hook to auto-visualize all Claude API responses.

    This patches the Anthropic client to automatically visualize responses.

    Args:
        save_to: Optional directory to save responses as JSON files

    Example:
        import claude_visualizer
        claude_visualizer.install_hook()

        # All subsequent API calls will be visualized
        response = client.messages.create(...)
    """
    global _auto_visualize
    _auto_visualize = True

    try:
        from anthropic import Anthropic

        original_create = Anthropic.messages.create

        @functools.wraps(original_create)
        def wrapped_create(self, *args, **kwargs):
            response = original_create(self, *args, **kwargs)

            # Visualize the response
            viz = visualize(save_to=save_to, auto_show=True)
            viz.capture(response)

            return response

        # Monkey-patch the create method
        Anthropic.messages.create = wrapped_create

    except ImportError:
        print("Warning: anthropic package not installed, hook not installed")


@contextmanager
def capture_responses(save_to: Optional[str] = None):
    """
    Context manager that captures responses without auto-visualization.

    Useful for collecting multiple responses and visualizing them later.

    Args:
        save_to: Optional directory to save responses as JSON files

    Example:
        with capture_responses(save_to="./responses") as capturer:
            response1 = client.messages.create(...)
            response2 = client.messages.create(...)

        # Manually visualize later
        for response in capturer.responses:
            visualize_response(response)
    """
    viz = visualize(save_to=save_to, auto_show=False)
    yield viz
