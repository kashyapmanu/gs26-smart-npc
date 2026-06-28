from __future__ import annotations
from typing import Optional

from feed.models import WorldEvent
from llm_config import safe_chat_completion


def maybe_refuse_payment_line(*, event: WorldEvent) -> Optional[str]:
    """Generate the grateful owner line when the player rescued the owner's niece."""
    prompt = (
        "You are the owner of a small restaurant in town. Earlier today "
        f"someone in town rescued a girl from a fire: {event.to_dict()}. "
        "The rescuer just sat down at one of your tables and ordered food. "
        "In one short, in-character sentence (no quote marks, no emojis), "
        "refuse their payment and reference the specific rescue. Stay grounded "
        "in the event facts given here; do not invent new details."
    )
    return safe_chat_completion(prompt) or None


def maybe_mournful_line(*, event) -> Optional[str]:
    """Generate the sad owner line when the child was harmed because the player
    did not rescue her. The event argument is the order_food event; the prompt
    supplies the un-grounded fact that no one helped."""
    prompt = (
        "You are the owner of a small restaurant in town. Earlier today a fire "
        "broke out and your niece was caught inside. No one helped her, and she "
        "was harmed. The player just sat down at one of your tables and ordered food. "
        "In one short, in-character sentence (no quote marks, no emojis), tell them "
        "you cannot offer a discount or free food because you are grieving. "
        f"Ground the line in these facts: {event.to_dict()}. Do not invent new details."
    )
    return safe_chat_completion(prompt) or None
