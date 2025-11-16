"""Basic usage examples for Claude Visualizer."""

import os
from anthropic import Anthropic

# Initialize the client
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# Example 1: Using context manager
def example_context_manager():
    """Visualize with context manager."""
    from claude_visualizer import visualize

    print("Example 1: Context Manager\n")

    with visualize():
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": "What is 2+2?"}],
        )

    return response


# Example 2: Using decorator
def example_decorator():
    """Visualize with decorator."""
    from claude_visualizer import visualize

    print("\nExample 2: Decorator\n")

    @visualize()
    def get_response():
        return client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Write a haiku about programming."}],
        )

    return get_response()


# Example 3: Manual capture with save
def example_manual_capture():
    """Manually capture and save responses."""
    from claude_visualizer import visualize

    print("\nExample 3: Manual Capture with Save\n")

    viz = visualize(save_to="./saved_responses", auto_show=True)

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Explain recursion briefly."}],
    )

    viz.capture(response)
    return response


# Example 4: Tool use visualization
def example_tool_use():
    """Visualize a response with tool calls."""
    from claude_visualizer import visualize

    print("\nExample 4: Tool Use\n")

    tools = [
        {
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    }
                },
                "required": ["location"],
            },
        }
    ]

    with visualize():
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            tools=tools,
            messages=[
                {"role": "user", "content": "What's the weather like in San Francisco?"}
            ],
        )

    return response


# Example 5: Install global hook
def example_global_hook():
    """Install global hook for automatic visualization."""
    from claude_visualizer import install_hook

    print("\nExample 5: Global Hook\n")

    # Install the hook once
    install_hook(save_to="./auto_saved")

    # All subsequent calls are automatically visualized
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Count to 5."}],
    )

    return response


if __name__ == "__main__":
    # Run examples (uncomment the ones you want to try)

    # example_context_manager()
    # example_decorator()
    # example_manual_capture()
    # example_tool_use()
    # example_global_hook()

    print("\nUncomment the examples you want to run in the __main__ block.")
