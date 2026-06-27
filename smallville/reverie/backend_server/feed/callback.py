from __future__ import annotations
from typing import Optional

from feed.models import WorldEvent
from llm_config import safe_chat_completion


def maybe_refuse_payment_line(owner_memory, *, event: WorldEvent) -> Optional[str]:
    """If `owner_memory` recalls the rescue observation, generate an LLM line
    grounded in the event. Otherwise return None (caller falls back to a
    generic transaction).

    Reads `owner_memory.seq_event` (a list of upstream ConceptNode objects
    with a `.description` attribute), matching upstream AssociativeMemory.
    """
    recollects = False
    try:
        seq = getattr(owner_memory, "seq_event", None) or []
        for node in seq:
            desc = getattr(node, "description", "") or ""
            text = desc.lower()
            if "rescued" in text and "fire" in text:
                recollects = True
                break
    except Exception:
        return None
    if not recollects:
        return None

    prompt = (
        "You are the owner of a small restaurant in town. Earlier today "
        f"someone in town rescued a girl from a fire: {event.to_dict()}. "
        "The rescuer just sat down at one of your tables and ordered food. "
        "In one short, in-character sentence (no quote marks, no emojis), "
        "refuse their payment and reference the specific rescue. Stay grounded "
        "in the event facts given here; do not invent new details."
    )
    return safe_chat_completion(prompt) or None