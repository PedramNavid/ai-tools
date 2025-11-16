"""Parse Claude API response objects into structured data for visualization."""

from typing import Any, Dict, List, Optional, Union
import json


class ParsedContent:
    """Represents a parsed content block from a Claude message."""

    def __init__(self, content_type: str, data: Dict[str, Any]):
        self.type = content_type
        self.data = data


class ParsedMessage:
    """Represents a parsed Claude message with metadata."""

    def __init__(
        self,
        role: str,
        content: List[ParsedContent],
        model: Optional[str] = None,
        stop_reason: Optional[str] = None,
        usage: Optional[Dict[str, int]] = None,
    ):
        self.role = role
        self.content = content
        self.model = model
        self.stop_reason = stop_reason
        self.usage = usage or {}


def parse_content_block(block: Union[Dict[str, Any], Any]) -> ParsedContent:
    """Parse a single content block from a message."""
    # Handle dict format (from JSON)
    if isinstance(block, dict):
        content_type = block.get("type", "unknown")
        return ParsedContent(content_type, block)

    # Handle Anthropic SDK objects
    if hasattr(block, "type"):
        content_type = block.type
        # Convert to dict for easier access
        if hasattr(block, "model_dump"):
            data = block.model_dump()
        elif hasattr(block, "dict"):
            data = block.dict()
        else:
            data = {"raw": str(block)}
        return ParsedContent(content_type, data)

    # Fallback for text strings
    if isinstance(block, str):
        return ParsedContent("text", {"text": block})

    return ParsedContent("unknown", {"raw": str(block)})


def parse_response(response: Union[Dict[str, Any], Any]) -> ParsedMessage:
    """
    Parse a Claude API response into a structured format.

    Args:
        response: Either a dict (from JSON) or an Anthropic Message object

    Returns:
        ParsedMessage with extracted information
    """
    # Handle dict format (from JSON)
    if isinstance(response, dict):
        role = response.get("role", "unknown")
        content_blocks = response.get("content", [])
        model = response.get("model")
        stop_reason = response.get("stop_reason")
        usage = response.get("usage", {})

        parsed_content = [parse_content_block(block) for block in content_blocks]

        return ParsedMessage(
            role=role,
            content=parsed_content,
            model=model,
            stop_reason=stop_reason,
            usage=usage,
        )

    # Handle Anthropic SDK Message object
    if hasattr(response, "content"):
        role = getattr(response, "role", "unknown")
        content_blocks = response.content
        model = getattr(response, "model", None)
        stop_reason = getattr(response, "stop_reason", None)

        # Extract usage stats
        usage = {}
        if hasattr(response, "usage"):
            usage_obj = response.usage
            if hasattr(usage_obj, "input_tokens"):
                usage["input_tokens"] = usage_obj.input_tokens
            if hasattr(usage_obj, "output_tokens"):
                usage["output_tokens"] = usage_obj.output_tokens

        parsed_content = [parse_content_block(block) for block in content_blocks]

        return ParsedMessage(
            role=role,
            content=parsed_content,
            model=model,
            stop_reason=stop_reason,
            usage=usage,
        )

    raise ValueError(f"Unsupported response type: {type(response)}")


def load_from_json(json_path: str) -> ParsedMessage:
    """Load and parse a Claude response from a JSON file."""
    with open(json_path, "r") as f:
        data = json.load(f)
    return parse_response(data)


def load_from_json_string(json_string: str) -> ParsedMessage:
    """Load and parse a Claude response from a JSON string."""
    data = json.loads(json_string)
    return parse_response(data)
