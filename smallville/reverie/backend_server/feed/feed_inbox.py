from __future__ import annotations
import datetime
from typing import List
from feed.models import Post


def deliver_to_inbox(persona, *, post: Post) -> None:
    """Write a received feed post into the persona's AssociativeMemory as an
    event observation, so it is part of the memory stream retrievable by
    relevance at dialogue time. Idempotent per post id.

    Uses upstream's add_event(created, expiration, s, p, o, description,
    keywords, poignancy, embedding_pair, filling) signature.
    """
    memory = persona.a_mem
    if post.id in memory.feed_inbox:
        return  # idempotent: don't double-write the same post

    created = getattr(persona.scratch, "curr_time", datetime.datetime.now())
    description = f"{post.author} posted: {post.text}"
    keywords = [str(post.author).lower(), "social_post", post.audience]
    # Zero-vector placeholder embedding so upstream's embeddings dict still
    # stores a 768-dim vector for the description without an LLM call.
    placeholder_vector = [0.0] * 768
    embedding_pair = (description, placeholder_vector)

    memory.add_event(
        created=created,
        expiration=None,
        s=post.author,
        p="posted",
        o="social feed",
        description=description,
        keywords=keywords,
        poignancy=1,
        embedding_pair=embedding_pair,
        filling=None,
    )
    memory.feed_inbox.append(post.id)


def drain_inbox(memory) -> List[str]:
    """Return and clear unread post IDs in the feed inbox."""
    pending = list(memory.feed_inbox)
    memory.feed_inbox = []
    return pending